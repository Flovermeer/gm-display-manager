import { Component, computed, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
  type AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';

import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import { PlayerDisplayStore } from '@app/features/display/application/player-display.store';
import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';
import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';
import type { PendingChangesAware } from '@app/core/navigation/pending-changes.guard';
import {
  createEmptyNpcSheet,
  createNpcFeature,
  NPC_STATUSES,
  type Npc,
  type NpcFeature,
  type NpcSheet,
  type NpcStatus,
  type UpdateNpcInput,
} from '@app/features/npcs/domain/npc';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { JournalEntryList } from '@app/features/journal/ui/journal-entry-list/journal-entry-list';
import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';
import {
  createEmptyRichTextDocument,
  type RichTextDocument,
} from '@app/shared/rich-text-editor/rich-text-document';
import { TagInput } from '@app/shared/ui/tag-input/tag-input';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { EmptyState } from '@app/shared/ui/empty-state/empty-state';
import { EntityTitle } from '@app/shared/ui/entity-title/entity-title';
import { FormField, type FormFieldOption } from '@app/shared/ui/form-field/form-field';

type PendingDecisionResolver = (canLeave: boolean) => void;
const DEMO_NPC_PORTRAIT_URL = '/demo/innkeeper.svg';
type NpcTagField =
  | 'savingThrows'
  | 'skills'
  | 'damageVulnerabilities'
  | 'damageResistances'
  | 'damageImmunities'
  | 'conditionImmunities'
  | 'senses'
  | 'languages';
type NpcFeatureSection = 'traits' | 'actions' | 'bonusActions' | 'reactions' | 'legendaryActions';
type NpcFeatureDrafts = Readonly<Record<NpcFeatureSection, readonly NpcFeature[]>>;

@Component({
  selector: 'app-npc-workspace',
  imports: [
    ReactiveFormsModule,
    RichTextEditor,
    TagInput,
    JournalEntryList,
    ButtonDirective,
    Dialog,
    EmptyState,
    EntityTitle,
    FormField,
  ],
  templateUrl: './npc-workspace.html',
  styleUrl: './npc-workspace.scss',
})
export class NpcWorkspace implements OnInit, PendingChangesAware {
  private readonly campaignContext = inject(CampaignContext);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly npcService = inject(NpcService);
  private readonly npcPortraitGateway = inject(NpcPortraitGateway);
  private readonly npcIdleVideoGateway = inject(NpcIdleVideoGateway);
  private readonly displayGateway = inject(DisplayGateway);
  private readonly playerDisplayStore = inject(PlayerDisplayStore);
  private pendingDecisionResolver?: PendingDecisionResolver;
  private readonly journalEntries = viewChild<JournalEntryList>(JournalEntryList);

  protected readonly campaign = this.campaignContext.campaign;
  protected readonly npcs = signal<readonly Npc[]>([]);
  protected readonly selectedNpc = signal<Npc | null>(null);
  protected readonly portraitUrl = signal<string>(DEMO_NPC_PORTRAIT_URL);
  protected readonly draftPortraitPath = signal<string | null>(null);
  protected readonly draftIdleVideoPath = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly isSidebarCollapsed = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isImportingPortrait = signal(false);
  protected readonly isImportingVideo = signal(false);
  protected readonly isPublishing = signal(false);
  protected readonly isPlayerDisplayOpen = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly showPendingChangesDialog = signal(false);
  protected readonly showDeleteDialog = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly focusedJournalEntryId = signal<string | null>(null);
  protected readonly statuses = NPC_STATUSES;
  protected readonly statusFieldOptions: readonly FormFieldOption[] = NPC_STATUSES.map(
    (status) => ({
      value: status,
      label: this.statusLabel(status),
    }),
  );
  protected readonly featureSections: readonly Readonly<{
    key: NpcFeatureSection;
    label: string;
    singularLabel: string;
  }>[] = [
    { key: 'traits', label: 'Capacités', singularLabel: 'une capacité' },
    { key: 'actions', label: 'Actions', singularLabel: 'une action' },
    { key: 'bonusActions', label: 'Actions bonus', singularLabel: 'une action bonus' },
    { key: 'reactions', label: 'Réactions', singularLabel: 'une réaction' },
    {
      key: 'legendaryActions',
      label: 'Actions légendaires',
      singularLabel: 'une action légendaire',
    },
  ];
  protected readonly featureDrafts = signal<NpcFeatureDrafts>(emptyFeatureDrafts());
  protected readonly officialDescriptionDraft = signal<RichTextDocument>(
    createEmptyRichTextDocument(),
  );
  protected readonly effectivePortraitPath = computed(
    () => this.draftPortraitPath() ?? this.selectedNpc()?.portraitPath ?? null,
  );
  protected readonly isUsingDemoPortrait = computed(() => this.effectivePortraitPath() === null);
  protected readonly effectiveIdleVideoPath = computed(
    () => this.draftIdleVideoPath() ?? this.selectedNpc()?.idleVideoPath ?? null,
  );
  protected readonly filteredNpcs = computed(() => {
    const searchTerm = this.searchTerm().trim().toLocaleLowerCase('fr');
    if (!searchTerm) {
      return this.npcs();
    }

    return this.npcs().filter((npc) =>
      [npc.name, npc.summary].some((value) => value.toLocaleLowerCase('fr').includes(searchTerm)),
    );
  });
  protected readonly npcForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    status: new FormControl<NpcStatus>('active', { nonNullable: true }),
    summary: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    size: new FormControl('', { nonNullable: true }),
    creatureType: new FormControl('', { nonNullable: true }),
    alignment: new FormControl('', { nonNullable: true }),
    armorClass: new FormControl<number | null>(null, [Validators.min(0), integerValidator]),
    armorClassDetails: new FormControl('', { nonNullable: true }),
    hitPoints: new FormControl<number | null>(null, [Validators.min(0), integerValidator]),
    hitPointFormula: new FormControl('', { nonNullable: true }),
    speed: new FormControl('', { nonNullable: true }),
    strength: new FormControl<number | null>(null, [Validators.min(0), integerValidator]),
    dexterity: new FormControl<number | null>(null, [Validators.min(0), integerValidator]),
    constitution: new FormControl<number | null>(null, [Validators.min(0), integerValidator]),
    intelligence: new FormControl<number | null>(null, [Validators.min(0), integerValidator]),
    wisdom: new FormControl<number | null>(null, [Validators.min(0), integerValidator]),
    charisma: new FormControl<number | null>(null, [Validators.min(0), integerValidator]),
    savingThrows: new FormControl<readonly string[]>([], { nonNullable: true }),
    skills: new FormControl<readonly string[]>([], { nonNullable: true }),
    damageVulnerabilities: new FormControl<readonly string[]>([], { nonNullable: true }),
    damageResistances: new FormControl<readonly string[]>([], { nonNullable: true }),
    damageImmunities: new FormControl<readonly string[]>([], { nonNullable: true }),
    conditionImmunities: new FormControl<readonly string[]>([], { nonNullable: true }),
    senses: new FormControl<readonly string[]>([], { nonNullable: true }),
    languages: new FormControl<readonly string[]>([], { nonNullable: true }),
    challengeRating: new FormControl('', { nonNullable: true }),
    experiencePoints: new FormControl<number | null>(null, [Validators.min(0), integerValidator]),
  });

  ngOnInit(): void {
    this.route.queryParamMap
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (params) => void this.openRequestedNpc(params.get('resourceId'), params.get('entryId')),
      );
    void this.initialize();
  }

  canDeactivate(): boolean | Promise<boolean> {
    return this.confirmPendingChanges();
  }

  protected toggleSidebar(): void {
    this.isSidebarCollapsed.update((collapsed) => !collapsed);
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected async requestSelectNpc(npc: Npc): Promise<void> {
    if (this.selectedNpc()?.id === npc.id && !this.isCreating()) {
      return;
    }

    if (await this.confirmPendingChanges()) {
      this.openReadOnly(npc);
    }
  }

  protected async requestCreateNpc(): Promise<void> {
    if (!(await this.confirmPendingChanges())) {
      return;
    }

    this.selectedNpc.set(null);
    this.portraitUrl.set(DEMO_NPC_PORTRAIT_URL);
    this.draftPortraitPath.set(null);
    this.draftIdleVideoPath.set(null);
    this.isCreating.set(true);
    this.isEditing.set(true);
    this.populateEmptyForm();
  }

  protected editNpc(): void {
    const npc = this.selectedNpc();
    if (!npc) {
      return;
    }

    this.isCreating.set(false);
    this.isEditing.set(true);
    this.populateForm(npc);
  }

  protected cancelEditing(): void {
    void this.abandonChanges();
  }

  protected async choosePortrait(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign || this.isImportingPortrait()) {
      return;
    }

    this.isImportingPortrait.set(true);
    this.error.set(null);

    try {
      const importedPath = await this.npcPortraitGateway.chooseAndImport(campaign.id);
      if (!importedPath) {
        return;
      }

      const previewUrl = await this.npcPortraitGateway
        .resolveUrl(importedPath)
        .catch(async (error: unknown) => {
          await this.npcPortraitGateway.discard(importedPath);
          throw error;
        });
      const previousDraft = this.draftPortraitPath();
      this.draftPortraitPath.set(importedPath);
      this.portraitUrl.set(previewUrl);
      this.npcForm.markAsDirty();

      if (previousDraft) {
        await this.npcPortraitGateway.discard(previousDraft);
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.isImportingPortrait.set(false);
    }
  }

  protected async chooseIdleVideo(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign || this.isImportingVideo()) return;
    this.isImportingVideo.set(true);
    this.error.set(null);
    try {
      const importedPath = await this.npcIdleVideoGateway.chooseAndImport(campaign.id);
      if (!importedPath) return;
      const previousDraft = this.draftIdleVideoPath();
      this.draftIdleVideoPath.set(importedPath);
      this.npcForm.markAsDirty();
      if (previousDraft) await this.npcIdleVideoGateway.discard(previousDraft);
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.isImportingVideo.set(false);
    }
  }

  protected async saveNpc(): Promise<boolean> {
    if (this.npcForm.invalid || this.isSaving()) {
      this.npcForm.markAllAsTouched();
      return false;
    }

    const campaign = this.campaign();
    if (!campaign) {
      return false;
    }

    this.isSaving.set(true);
    this.error.set(null);

    try {
      const selectedNpc = this.selectedNpc();
      const portraitPath = this.effectivePortraitPath();
      const idleVideoPath = this.effectiveIdleVideoPath();
      const previousIdleVideoPath = selectedNpc?.idleVideoPath ?? null;
      const savedNpc = this.isCreating()
        ? await this.npcService.create(campaign.id, this.formInput(), portraitPath, idleVideoPath)
        : selectedNpc
          ? await this.npcService.update(selectedNpc, this.formInput(), portraitPath, idleVideoPath)
          : null;

      if (!savedNpc) {
        return false;
      }

      this.draftPortraitPath.set(null);
      this.draftIdleVideoPath.set(null);
      await this.reloadNpcs();
      this.openReadOnly(savedNpc);
      await this.refreshPublishedNpc(savedNpc);
      if (previousIdleVideoPath && previousIdleVideoPath !== savedNpc.idleVideoPath) {
        await this.npcIdleVideoGateway.discard(previousIdleVideoPath);
      }
      return true;
    } catch (error) {
      this.error.set(this.errorMessage(error));
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  protected requestDeleteNpc(): void {
    if (this.selectedNpc()) {
      this.showDeleteDialog.set(true);
    }
  }

  protected async showNpcOnPlayerDisplay(): Promise<void> {
    const npc = this.selectedNpc();
    if (!npc || !this.isPlayerDisplayOpen() || this.isPublishing()) {
      return;
    }

    this.isPublishing.set(true);
    this.error.set(null);

    try {
      const state = {
        mode: 'npc' as const,
        npcId: npc.id,
        name: npc.name,
        portraitPath: npc.portraitPath
          ? await this.npcPortraitGateway.resolveUrl(npc.portraitPath)
          : DEMO_NPC_PORTRAIT_URL,
        ...(npc.idleVideoPath
          ? { idleVideoPath: await this.npcIdleVideoGateway.resolveUrl(npc.idleVideoPath) }
          : {}),
      };
      this.playerDisplayStore.setState(state);
      await this.displayGateway.sendPlayerDisplayState(state);
    } catch (error) {
      this.error.set(this.errorMessage(error));
      this.isPlayerDisplayOpen.set(false);
    } finally {
      this.isPublishing.set(false);
    }
  }

  protected playerDisplayActionTitle(): string {
    if (!this.isPlayerDisplayOpen()) {
      return "Ouvre d'abord l'écran joueurs depuis la régie.";
    }

    return "Afficher ce PNJ sur l'écran joueurs";
  }

  protected cancelDelete(): void {
    this.showDeleteDialog.set(false);
  }

  protected async confirmDeleteNpc(): Promise<void> {
    const npc = this.selectedNpc();
    if (!npc || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);

    try {
      const displayState = this.playerDisplayStore.state();
      if (displayState.mode === 'npc' && displayState.npcId === npc.id) {
        this.playerDisplayStore.showBlank();
        if (this.isPlayerDisplayOpen()) {
          await this.displayGateway.sendPlayerDisplayState({ mode: 'blank' });
        }
      }

      await this.npcService.delete(npc);
      if (npc.portraitPath) {
        try {
          await this.npcPortraitGateway.discard(npc.portraitPath);
        } catch (error) {
          this.error.set(this.errorMessage(error));
        }
      }
      if (npc.idleVideoPath) {
        try {
          await this.npcIdleVideoGateway.discard(npc.idleVideoPath);
        } catch (error) {
          this.error.set(this.errorMessage(error));
        }
      }
      await this.reloadNpcs();
      this.selectedNpc.set(null);
      this.portraitUrl.set(DEMO_NPC_PORTRAIT_URL);
      this.showDeleteDialog.set(false);
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected continueEditing(): void {
    this.resolvePendingDecision(false);
  }

  protected async leaveWithoutSaving(): Promise<void> {
    if (this.journalEntries()?.hasPendingChanges()) this.journalEntries()?.discardPendingChanges();
    if (this.isEditing() && this.npcForm.dirty) await this.abandonChanges();
    this.resolvePendingDecision(true);
  }

  protected async saveAndLeave(): Promise<void> {
    const saved = this.journalEntries()?.hasPendingChanges()
      ? await this.journalEntries()!.savePendingChanges()
      : await this.saveNpc();
    if (saved) {
      this.resolvePendingDecision(true);
    }
  }

  protected statusLabel(status: NpcStatus): string {
    const labels: Record<NpcStatus, string> = {
      active: 'Actif',
      dead: 'Mort',
      retired: 'Retiré',
      missing: 'Disparu',
    };
    return labels[status];
  }

  protected statusIcon(status: NpcStatus): string {
    const icons: Record<NpcStatus, string> = {
      active: 'V',
      dead: '💀',
      missing: '?',
      retired: 'X',
    };
    return icons[status];
  }

  protected updateTags(field: NpcTagField, value: readonly string[]): void {
    this.npcForm.controls[field].setValue(value);
    this.npcForm.controls[field].markAsDirty();
  }

  protected addFeature(section: NpcFeatureSection): void {
    this.featureDrafts.update((drafts) => ({
      ...drafts,
      [section]: [...drafts[section], createNpcFeature()],
    }));
    this.npcForm.markAsDirty();
  }

  protected removeFeature(section: NpcFeatureSection, featureId: string): void {
    this.featureDrafts.update((drafts) => ({
      ...drafts,
      [section]: drafts[section].filter((feature) => feature.id !== featureId),
    }));
    this.npcForm.markAsDirty();
  }

  protected updateFeatureName(
    section: NpcFeatureSection,
    featureId: string,
    value: string | number | null,
  ): void {
    const name = String(value ?? '');
    this.updateFeature(section, featureId, (feature) => ({ ...feature, name }));
  }

  protected updateFeatureDescription(
    section: NpcFeatureSection,
    featureId: string,
    description: RichTextDocument,
  ): void {
    this.updateFeature(section, featureId, (feature) => ({ ...feature, description }));
  }

  protected updateOfficialDescription(description: RichTextDocument): void {
    this.officialDescriptionDraft.set(description);
    this.npcForm.markAsDirty();
  }

  protected abilityModifier(score: number | null): string {
    if (score === null) return '—';
    const modifier = Math.floor((score - 10) / 2);
    return `${score} (${modifier >= 0 ? '+' : ''}${modifier})`;
  }

  protected npcTypeLine(sheet: NpcSheet): string {
    return [sheet.size, sheet.creatureType, sheet.alignment].filter(Boolean).join(', ') || '—';
  }

  protected armorClassLabel(sheet: NpcSheet): string {
    if (sheet.armorClass === null) return '—';
    return sheet.armorClassDetails
      ? `${sheet.armorClass} (${sheet.armorClassDetails})`
      : String(sheet.armorClass);
  }

  protected hitPointsLabel(sheet: NpcSheet): string {
    if (sheet.hitPoints === null) return '—';
    return sheet.hitPointFormula
      ? `${sheet.hitPoints} (${sheet.hitPointFormula})`
      : String(sheet.hitPoints);
  }

  protected challengeLabel(sheet: NpcSheet): string {
    if (!sheet.challengeRating && sheet.experiencePoints === null) return '—';
    const experience =
      sheet.experiencePoints === null
        ? ''
        : ` (${new Intl.NumberFormat('fr-FR').format(sheet.experiencePoints)} PX)`;
    return `${sheet.challengeRating || '—'}${experience}`;
  }

  protected hasInvalidSheetNumbers(): boolean {
    return [
      this.npcForm.controls.armorClass,
      this.npcForm.controls.hitPoints,
      this.npcForm.controls.strength,
      this.npcForm.controls.dexterity,
      this.npcForm.controls.constitution,
      this.npcForm.controls.intelligence,
      this.npcForm.controls.wisdom,
      this.npcForm.controls.charisma,
      this.npcForm.controls.experiencePoints,
    ].some((control) => control.invalid && (control.dirty || control.touched));
  }

  private async initialize(): Promise<void> {
    try {
      if (!(await this.campaignContext.load())) return;
      await this.reloadNpcs();
      await this.openRequestedNpc(
        this.route.snapshot.queryParamMap?.get('resourceId'),
        this.route.snapshot.queryParamMap?.get('entryId'),
      );
      if (this.displayGateway.isDesktop) {
        this.isPlayerDisplayOpen.set(await this.displayGateway.isPlayerDisplayOpen());
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async openRequestedNpc(resourceId: string | null, entryId: string | null): Promise<void> {
    const requested = this.npcs().find(({ id }) => id === resourceId);
    if (!requested || requested.id === this.selectedNpc()?.id) return;
    if (!(await this.confirmPendingChanges())) return;
    this.focusedJournalEntryId.set(entryId);
    this.openReadOnly(requested);
  }

  private async reloadNpcs(): Promise<void> {
    const campaign = this.campaign();
    if (campaign) {
      this.npcs.set(await this.npcService.list(campaign.id));
    }
  }

  private openReadOnly(npc: Npc): void {
    const refreshedNpc = this.npcs().find((candidate) => candidate.id === npc.id) ?? npc;
    this.selectedNpc.set(refreshedNpc);
    this.isCreating.set(false);
    this.isEditing.set(false);
    this.draftPortraitPath.set(null);
    this.draftIdleVideoPath.set(null);
    this.populateForm(refreshedNpc);
    void this.loadPortraitPreview(refreshedNpc.portraitPath);
  }

  private populateForm(npc: Npc): void {
    const sheet = npc.sheet;
    this.npcForm.reset({
      name: npc.name,
      status: npc.status,
      summary: npc.summary,
      notes: '',
      size: sheet.size,
      creatureType: sheet.creatureType,
      alignment: sheet.alignment,
      armorClass: sheet.armorClass,
      armorClassDetails: sheet.armorClassDetails,
      hitPoints: sheet.hitPoints,
      hitPointFormula: sheet.hitPointFormula,
      speed: sheet.speed,
      strength: sheet.abilities.strength,
      dexterity: sheet.abilities.dexterity,
      constitution: sheet.abilities.constitution,
      intelligence: sheet.abilities.intelligence,
      wisdom: sheet.abilities.wisdom,
      charisma: sheet.abilities.charisma,
      savingThrows: sheet.savingThrows,
      skills: sheet.skills,
      damageVulnerabilities: sheet.damageVulnerabilities,
      damageResistances: sheet.damageResistances,
      damageImmunities: sheet.damageImmunities,
      conditionImmunities: sheet.conditionImmunities,
      senses: sheet.senses,
      languages: sheet.languages,
      challengeRating: sheet.challengeRating,
      experiencePoints: sheet.experiencePoints,
    });
    this.featureDrafts.set(featureDraftsFromSheet(sheet));
    this.officialDescriptionDraft.set(sheet.officialDescription);
    this.npcForm.markAsPristine();
  }

  private populateEmptyForm(): void {
    const sheet = createEmptyNpcSheet();
    this.npcForm.reset({
      name: '',
      status: 'active',
      summary: '',
      notes: '',
      size: sheet.size,
      creatureType: sheet.creatureType,
      alignment: sheet.alignment,
      armorClass: sheet.armorClass,
      armorClassDetails: sheet.armorClassDetails,
      hitPoints: sheet.hitPoints,
      hitPointFormula: sheet.hitPointFormula,
      speed: sheet.speed,
      strength: sheet.abilities.strength,
      dexterity: sheet.abilities.dexterity,
      constitution: sheet.abilities.constitution,
      intelligence: sheet.abilities.intelligence,
      wisdom: sheet.abilities.wisdom,
      charisma: sheet.abilities.charisma,
      savingThrows: sheet.savingThrows,
      skills: sheet.skills,
      damageVulnerabilities: sheet.damageVulnerabilities,
      damageResistances: sheet.damageResistances,
      damageImmunities: sheet.damageImmunities,
      conditionImmunities: sheet.conditionImmunities,
      senses: sheet.senses,
      languages: sheet.languages,
      challengeRating: sheet.challengeRating,
      experiencePoints: sheet.experiencePoints,
    });
    this.featureDrafts.set(emptyFeatureDrafts());
    this.officialDescriptionDraft.set(sheet.officialDescription);
    this.npcForm.markAsPristine();
  }

  private async abandonChanges(): Promise<void> {
    const draftPortraitPath = this.draftPortraitPath();
    const draftIdleVideoPath = this.draftIdleVideoPath();
    this.draftPortraitPath.set(null);
    this.draftIdleVideoPath.set(null);
    if (draftPortraitPath) {
      try {
        await this.npcPortraitGateway.discard(draftPortraitPath);
      } catch (error) {
        this.error.set(this.errorMessage(error));
      }
    }
    if (draftIdleVideoPath) {
      try {
        await this.npcIdleVideoGateway.discard(draftIdleVideoPath);
      } catch (error) {
        this.error.set(this.errorMessage(error));
      }
    }

    const selectedNpc = this.selectedNpc();
    this.isEditing.set(false);
    this.isCreating.set(false);
    if (selectedNpc) {
      this.populateForm(selectedNpc);
      await this.loadPortraitPreview(selectedNpc.portraitPath);
    } else {
      this.populateEmptyForm();
      this.portraitUrl.set(DEMO_NPC_PORTRAIT_URL);
    }
  }

  private formInput(): UpdateNpcInput {
    const value = this.npcForm.getRawValue();
    return {
      name: value.name,
      status: value.status,
      summary: value.summary,
      notes: '',
      sheet: {
        size: value.size,
        creatureType: value.creatureType,
        alignment: value.alignment,
        armorClass: value.armorClass,
        armorClassDetails: value.armorClassDetails,
        hitPoints: value.hitPoints,
        hitPointFormula: value.hitPointFormula,
        speed: value.speed,
        abilities: {
          strength: value.strength,
          dexterity: value.dexterity,
          constitution: value.constitution,
          intelligence: value.intelligence,
          wisdom: value.wisdom,
          charisma: value.charisma,
        },
        savingThrows: value.savingThrows,
        skills: value.skills,
        damageVulnerabilities: value.damageVulnerabilities,
        damageResistances: value.damageResistances,
        damageImmunities: value.damageImmunities,
        conditionImmunities: value.conditionImmunities,
        senses: value.senses,
        languages: value.languages,
        challengeRating: value.challengeRating,
        experiencePoints: value.experiencePoints,
        officialDescription: this.officialDescriptionDraft(),
        ...this.featureDrafts(),
      },
    };
  }

  private updateFeature(
    section: NpcFeatureSection,
    featureId: string,
    transform: (feature: NpcFeature) => NpcFeature,
  ): void {
    this.featureDrafts.update((drafts) => ({
      ...drafts,
      [section]: drafts[section].map((feature) =>
        feature.id === featureId ? transform(feature) : feature,
      ),
    }));
    this.npcForm.markAsDirty();
  }

  private async loadPortraitPreview(relativePath: string | null): Promise<void> {
    this.portraitUrl.set(DEMO_NPC_PORTRAIT_URL);
    if (!relativePath) {
      return;
    }

    try {
      const url = await this.npcPortraitGateway.resolveUrl(relativePath);
      if (this.effectivePortraitPath() === relativePath) {
        this.portraitUrl.set(url);
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  private async refreshPublishedNpc(npc: Npc): Promise<void> {
    const currentState = this.playerDisplayStore.state();
    if (currentState.mode !== 'npc' || currentState.npcId !== npc.id) {
      return;
    }

    const state = {
      ...currentState,
      name: npc.name,
      portraitPath: npc.portraitPath
        ? await this.npcPortraitGateway.resolveUrl(npc.portraitPath)
        : DEMO_NPC_PORTRAIT_URL,
      idleVideoPath: npc.idleVideoPath
        ? await this.npcIdleVideoGateway.resolveUrl(npc.idleVideoPath)
        : undefined,
    };
    this.playerDisplayStore.setState(state);
    if (this.isPlayerDisplayOpen()) {
      await this.displayGateway.sendPlayerDisplayState(state);
    }
  }

  private confirmPendingChanges(): boolean | Promise<boolean> {
    if (!(this.isEditing() && this.npcForm.dirty) && !this.journalEntries()?.hasPendingChanges()) {
      return true;
    }

    if (this.pendingDecisionResolver) {
      return false;
    }

    this.showPendingChangesDialog.set(true);
    return new Promise<boolean>((resolve) => {
      this.pendingDecisionResolver = resolve;
    });
  }

  private resolvePendingDecision(canLeave: boolean): void {
    const resolve = this.pendingDecisionResolver;
    this.pendingDecisionResolver = undefined;
    this.showPendingChangesDialog.set(false);
    resolve?.(canLeave);
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Une erreur inattendue est survenue.';
  }
}

function emptyFeatureDrafts(): NpcFeatureDrafts {
  return {
    traits: [],
    actions: [],
    bonusActions: [],
    reactions: [],
    legendaryActions: [],
  };
}

function featureDraftsFromSheet(sheet: NpcSheet): NpcFeatureDrafts {
  return {
    traits: sheet.traits,
    actions: sheet.actions,
    bonusActions: sheet.bonusActions,
    reactions: sheet.reactions,
    legendaryActions: sheet.legendaryActions,
  };
}

function integerValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === null || Number.isInteger(control.value) ? null : { integer: true };
}
