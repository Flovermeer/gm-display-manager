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
import { CombatStore } from '@app/features/combat/application/combat.store';
import { npcCombatantSource } from '@app/features/combat/domain/combatant-source';
import { CharacterRuleCatalogService } from '@app/features/game-systems/application/character-rule-catalog.service';
import {
  EMPTY_CHARACTER_RULE_CATALOG,
  subracesForRace,
  type CharacterRuleCatalog,
} from '@app/features/game-systems/domain/character-rule-catalog';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import { PlayerDisplayStore } from '@app/features/display/application/player-display.store';
import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';
import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';
import type { PendingChangesAware } from '@app/core/navigation/pending-changes.guard';
import {
  createEmptyNpcSheet,
  NPC_STATUSES,
  type Npc,
  type NpcSheet,
  type NpcStatus,
  type UpdateNpcInput,
} from '@app/features/npcs/domain/npc';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { JournalEntryList } from '@app/features/journal/ui/journal-entry-list/journal-entry-list';
import { RecentResourceTrackerDirective } from '@app/features/recent-resources/ui/recent-resource-tracker.directive';
import { RecentResourceStore } from '@app/features/recent-resources/application/recent-resource.store';
import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';
import type { ResourceMentionCandidate } from '@app/shared/rich-text-editor/resource-mention';
import { ResourceMentionNavigationService } from '@app/shared/rich-text-editor/resource-mention-navigation.service';
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
import { ActiveSceneService } from '@app/features/scenes/application/active-scene.service';
import { RichTextFeatureEditor } from '@app/shared/ui/rich-text-feature-editor/rich-text-feature-editor';
import { RichTextFeatureSection } from '@app/shared/ui/rich-text-feature-section/rich-text-feature-section';
import { CreatureRuleCatalogService } from '@app/features/game-systems/application/creature-rule-catalog.service';
import {
  EMPTY_CREATURE_RULE_CATALOG,
  optionIdFor,
  optionLabel,
  type CreatureRuleCatalog,
} from '@app/features/game-systems/domain/creature-rule-catalog';
import { MultiSelectField } from '@app/shared/ui/multi-select-field/multi-select-field';
import {
  CREATURE_FEATURE_SECTIONS,
  creatureFeatureDraftsFrom,
  emptyCreatureFeatureDrafts,
  type CreatureFeatureDrafts,
  type CreatureFeatureSection,
} from '@app/shared/ui/rich-text-feature-editor/creature-feature-sections';
import { errorMessage } from '@app/shared/error-message';
import { PendingChangesPrompt } from '@app/core/navigation/pending-changes-prompt';
import { PendingChangesDialog } from '@app/shared/ui/pending-changes-dialog/pending-changes-dialog';

const DEMO_NPC_PORTRAIT_URL = '/demo/npc-placeholder.png';
type NpcTagField =
  | 'savingThrows'
  | 'skills'
  | 'damageVulnerabilities'
  | 'damageResistances'
  | 'damageImmunities'
  | 'conditionImmunities'
  | 'senses';

@Component({
  selector: 'app-npc-workspace',
  imports: [
    PendingChangesDialog,
    ReactiveFormsModule,
    RichTextEditor,
    TagInput,
    JournalEntryList,
    ButtonDirective,
    Dialog,
    EmptyState,
    EntityTitle,
    FormField,
    RichTextFeatureEditor,
    RichTextFeatureSection,
    MultiSelectField,
    RecentResourceTrackerDirective,
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
  private readonly activeSceneService = inject(ActiveSceneService);
  private readonly creatureRules = inject(CreatureRuleCatalogService);
  private readonly characterRules = inject(CharacterRuleCatalogService);
  private readonly mentionNavigation = inject(ResourceMentionNavigationService);
  private readonly combat = inject(CombatStore, { optional: true });
  private readonly recentResources = inject(RecentResourceStore, { optional: true });
  private readonly journalEntries = viewChild<JournalEntryList>(JournalEntryList);

  protected readonly campaign = this.campaignContext.campaign;
  protected readonly npcs = signal<readonly Npc[]>([]);
  protected readonly availableNpcs = signal<readonly Npc[]>([]);
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
  protected readonly pendingChanges = new PendingChangesPrompt();
  protected readonly showDeleteDialog = signal(false);
  protected readonly showCatalogDialog = signal(false);
  protected readonly showPromotionDialog = signal(false);
  protected readonly showResetDialog = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly focusedJournalEntryId = signal<string | null>(null);
  protected readonly mentionCandidates = signal<readonly ResourceMentionCandidate[]>([]);
  protected readonly statuses = NPC_STATUSES;
  protected readonly statusFieldOptions: readonly FormFieldOption[] = NPC_STATUSES.map(
    (status) => ({
      value: status,
      label: this.statusLabel(status),
    }),
  );
  protected readonly featureSections = CREATURE_FEATURE_SECTIONS;
  protected readonly featureDrafts = signal<CreatureFeatureDrafts>(emptyCreatureFeatureDrafts());
  protected readonly officialDescriptionDraft = signal<RichTextDocument>(
    createEmptyRichTextDocument(),
  );
  protected readonly ruleCatalog = signal<CreatureRuleCatalog>(EMPTY_CREATURE_RULE_CATALOG);
  protected readonly characterRuleCatalog = signal<CharacterRuleCatalog>(
    EMPTY_CHARACTER_RULE_CATALOG,
  );
  protected readonly sizeOptions = computed(() => this.formOptions(this.ruleCatalog().sizes));
  protected readonly raceOptions = computed(() =>
    this.formOptions(this.characterRuleCatalog().races, this.selectedNpc()?.sheet.race),
  );
  protected subraceOptions(): readonly FormFieldOption[] {
    const raceId = this.npcForm.controls.race.value;
    return this.formOptions(
      subracesForRace(this.characterRuleCatalog(), raceId),
      this.selectedNpc()?.sheet.subrace,
    );
  }
  protected readonly classOptions = computed(() =>
    this.formOptions(this.characterRuleCatalog().classes, this.selectedNpc()?.sheet.className),
  );
  protected readonly alignmentOptions = computed(() =>
    this.formOptions(this.ruleCatalog().alignments),
  );
  protected readonly languageOptions = computed(() =>
    this.formOptions(this.ruleCatalog().languages),
  );
  protected readonly effectivePortraitPath = computed(
    () => this.draftPortraitPath() ?? this.selectedNpc()?.portraitPath ?? null,
  );
  protected readonly isUsingDemoPortrait = computed(() => this.effectivePortraitPath() === null);
  protected readonly effectiveIdleVideoPath = computed(
    () => this.draftIdleVideoPath() ?? this.selectedNpc()?.idleVideoPath ?? null,
  );
  protected readonly isSelectedNpcDisplayed = computed(() => {
    const npc = this.selectedNpc();
    const state = this.playerDisplayStore.state();
    return npc !== null && state.mode === 'npc' && state.npcId === npc.id;
  });
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
    race: new FormControl('', { nonNullable: true }),
    subrace: new FormControl('', { nonNullable: true }),
    className: new FormControl('', { nonNullable: true }),
    occupation: new FormControl('', { nonNullable: true }),
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

  protected addToCombat(npc: Npc): void {
    void this.combat?.requestAdd(npcCombatantSource(npc));
  }

  protected raceChanged(): void {
    const current = this.npcForm.controls.subrace.value;
    const raceId = this.npcForm.controls.race.value;
    if (
      current &&
      !subracesForRace(this.characterRuleCatalog(), raceId).some(({ id }) => id === current)
    ) {
      this.npcForm.controls.subrace.setValue('');
    }
  }

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

  protected updateLanguages(values: readonly string[]): void {
    this.npcForm.controls.languages.setValue(values);
    this.npcForm.controls.languages.markAsDirty();
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

  protected async openCatalog(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign || !(await this.confirmPendingChanges())) return;
    this.availableNpcs.set(await this.npcService.listAvailable(campaign.id));
    this.showCatalogDialog.set(true);
  }

  protected async attachNpc(npc: Npc): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    await this.npcService.attach(campaign.id, npc.id);
    this.showCatalogDialog.set(false);
    await this.reloadNpcs();
    const attached = this.npcs().find(({ id }) => id === npc.id);
    if (attached) this.openReadOnly(attached);
  }

  protected requestPromotion(): void {
    this.showPromotionDialog.set(true);
  }

  protected async confirmPromotion(): Promise<void> {
    const npc = this.selectedNpc();
    if (!npc) return;
    await this.npcService.promote(npc);
    this.showPromotionDialog.set(false);
    await this.reloadNpcs();
    const refreshed = this.npcs().find(({ id }) => id === npc.id);
    if (refreshed) this.openReadOnly(refreshed);
  }

  protected requestReset(): void {
    this.showResetDialog.set(true);
  }

  protected async confirmReset(): Promise<void> {
    const npc = this.selectedNpc();
    if (!npc) return;
    await this.npcService.resetOverride(npc);
    this.showResetDialog.set(false);
    await this.reloadNpcs();
    const refreshed = this.npcs().find(({ id }) => id === npc.id);
    if (refreshed) this.openReadOnly(refreshed);
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
      const importedPath = await this.npcPortraitGateway.chooseAndImport(campaign.universeId);
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
      this.error.set(errorMessage(error));
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
      const importedPath = await this.npcIdleVideoGateway.chooseAndImport(campaign.universeId);
      if (!importedPath) return;
      const previousDraft = this.draftIdleVideoPath();
      this.draftIdleVideoPath.set(importedPath);
      this.npcForm.markAsDirty();
      if (previousDraft) await this.npcIdleVideoGateway.discard(previousDraft);
    } catch (error) {
      this.error.set(errorMessage(error));
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
      this.error.set(errorMessage(error));
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
      await this.activeSceneService.clear(npc.campaignId);
      if (this.isSelectedNpcDisplayed()) {
        const state = { mode: 'neutral' as const };
        this.playerDisplayStore.setState(state);
        await this.displayGateway.sendPlayerDisplayState(state);
        return;
      }
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
      this.error.set(errorMessage(error));
      this.isPlayerDisplayOpen.set(false);
    } finally {
      this.isPublishing.set(false);
    }
  }

  protected playerDisplayActionTitle(): string {
    if (!this.isPlayerDisplayOpen()) {
      return "Ouvre d'abord l'écran joueurs depuis la régie.";
    }

    return this.isSelectedNpcDisplayed()
      ? "Retirer ce PNJ de l'écran joueurs"
      : "Afficher ce PNJ sur l'écran joueurs";
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
        this.playerDisplayStore.showNeutral();
        if (this.isPlayerDisplayOpen()) {
          await this.displayGateway.sendPlayerDisplayState({ mode: 'neutral' });
        }
      }

      await this.npcService.delete(npc);
      await this.recentResources?.remove('npc', npc.id);
      if (npc.portraitPath) {
        try {
          await this.npcPortraitGateway.discard(npc.portraitPath);
        } catch (error) {
          this.error.set(errorMessage(error));
        }
      }
      if (npc.idleVideoPath) {
        try {
          await this.npcIdleVideoGateway.discard(npc.idleVideoPath);
        } catch (error) {
          this.error.set(errorMessage(error));
        }
      }
      await this.reloadNpcs();
      this.selectedNpc.set(null);
      this.portraitUrl.set(DEMO_NPC_PORTRAIT_URL);
      this.showDeleteDialog.set(false);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected continueEditing(): void {
    this.pendingChanges.resolve(false);
  }

  protected async leaveWithoutSaving(): Promise<void> {
    if (this.journalEntries()?.hasPendingChanges()) this.journalEntries()?.discardPendingChanges();
    if (this.isEditing() && this.npcForm.dirty) await this.abandonChanges();
    this.pendingChanges.resolve(true);
  }

  protected async saveAndLeave(): Promise<void> {
    const saved = this.journalEntries()?.hasPendingChanges()
      ? await this.journalEntries()!.savePendingChanges()
      : await this.saveNpc();
    if (saved) {
      this.pendingChanges.resolve(true);
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

  protected updateFeatureSection(
    section: CreatureFeatureSection,
    features: CreatureFeatureDrafts[CreatureFeatureSection],
  ): void {
    this.featureDrafts.update((drafts) => ({ ...drafts, [section]: features }));
    this.npcForm.markAsDirty();
  }

  protected updateOfficialDescription(description: RichTextDocument): void {
    this.officialDescriptionDraft.set(description);
    this.npcForm.markAsDirty();
  }

  protected openMention(mention: ResourceMentionCandidate): void {
    const campaign = this.campaign();
    if (campaign) void this.mentionNavigation.open(campaign.id, mention);
  }

  protected abilityModifier(score: number | null): string {
    if (score === null) return '—';
    const modifier = Math.floor((score - 10) / 2);
    return `${score} (${modifier >= 0 ? '+' : ''}${modifier})`;
  }

  protected npcTypeLine(sheet: NpcSheet): string {
    return (
      [sheet.size, sheet.race, sheet.subrace, sheet.className, sheet.alignment]
        .filter(Boolean)
        .join(', ') || '—'
    );
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
      await this.loadSupportingCatalogs();
      await this.reloadNpcs();
      await this.openRequestedNpc(
        this.route.snapshot.queryParamMap?.get('resourceId'),
        this.route.snapshot.queryParamMap?.get('entryId'),
      );
      if (this.displayGateway.isDesktop) {
        this.isPlayerDisplayOpen.set(await this.displayGateway.isPlayerDisplayOpen());
      }
    } catch (error) {
      this.error.set(errorMessage(error));
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
      size: optionIdFor(sheet.sizeOptionId, sheet.size, this.ruleCatalog().sizes),
      race:
        optionIdFor(sheet.raceOptionId, sheet.race, this.characterRuleCatalog().races) ||
        sheet.race,
      subrace:
        optionIdFor(sheet.subraceOptionId, sheet.subrace, this.characterRuleCatalog().subraces) ||
        sheet.subrace,
      className:
        optionIdFor(sheet.classOptionId, sheet.className, this.characterRuleCatalog().classes) ||
        sheet.className,
      occupation: sheet.occupation,
      alignment: optionIdFor(
        sheet.alignmentOptionId,
        sheet.alignment,
        this.ruleCatalog().alignments,
      ),
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
      languages:
        sheet.languageOptionIds.length > 0
          ? sheet.languageOptionIds
          : sheet.languages.flatMap((label) => {
              const id = optionIdFor(null, label, this.ruleCatalog().languages);
              return id ? [id] : [];
            }),
      challengeRating: sheet.challengeRating,
      experiencePoints: sheet.experiencePoints,
    });
    this.featureDrafts.set(creatureFeatureDraftsFrom(sheet));
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
      race: sheet.race,
      subrace: sheet.subrace,
      className: sheet.className,
      occupation: sheet.occupation,
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
      languages: sheet.languageOptionIds,
      challengeRating: sheet.challengeRating,
      experiencePoints: sheet.experiencePoints,
    });
    this.featureDrafts.set(emptyCreatureFeatureDrafts());
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
        this.error.set(errorMessage(error));
      }
    }
    if (draftIdleVideoPath) {
      try {
        await this.npcIdleVideoGateway.discard(draftIdleVideoPath);
      } catch (error) {
        this.error.set(errorMessage(error));
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
    const previous = this.selectedNpc()?.sheet ?? createEmptyNpcSheet();
    return {
      name: value.name,
      status: value.status,
      summary: value.summary,
      notes: '',
      sheet: {
        sizeOptionId: value.size || null,
        size: optionLabel(value.size, this.ruleCatalog().sizes),
        creatureTypeOptionId: previous.creatureTypeOptionId,
        creatureType: previous.creatureType,
        creatureSubspeciesOptionId: previous.creatureSubspeciesOptionId,
        creatureSubspecies: previous.creatureSubspecies,
        raceOptionId: this.optionId(value.race, this.characterRuleCatalog().races),
        race: optionLabel(value.race, this.characterRuleCatalog().races, value.race),
        subraceOptionId: this.optionId(value.subrace, this.characterRuleCatalog().subraces),
        subrace: optionLabel(value.subrace, this.characterRuleCatalog().subraces, value.subrace),
        classOptionId: this.optionId(value.className, this.characterRuleCatalog().classes),
        className: optionLabel(
          value.className,
          this.characterRuleCatalog().classes,
          value.className,
        ),
        occupation: value.occupation,
        alignmentOptionId: value.alignment || null,
        alignment: optionLabel(value.alignment, this.ruleCatalog().alignments),
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
        languageOptionIds: value.languages,
        languages: value.languages.map((id) => optionLabel(id, this.ruleCatalog().languages, id)),
        challengeRating: value.challengeRating,
        experiencePoints: value.experiencePoints,
        officialDescription: this.officialDescriptionDraft(),
        ...this.featureDrafts(),
      },
    };
  }

  private async loadSupportingCatalogs(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    const [creatureCatalog, characterCatalog, mentionCandidates] = await Promise.all([
      this.creatureRules.loadForUniverse(campaign.universeId),
      this.characterRules.loadForUniverse(campaign.universeId),
      this.mentionNavigation.listCandidates(campaign.id),
    ]);
    this.ruleCatalog.set(creatureCatalog);
    this.characterRuleCatalog.set(characterCatalog);
    this.mentionCandidates.set(mentionCandidates);
  }

  private formOptions(
    options: readonly { id: string; label: string; code: string }[],
    legacyLabel = '',
  ): readonly FormFieldOption[] {
    const normalized = legacyLabel.trim().toLocaleLowerCase('fr');
    const mapped = options.some(
      ({ label, code }) =>
        label.toLocaleLowerCase('fr') === normalized || code.toLocaleLowerCase('fr') === normalized,
    );
    return [
      ...options.map(({ id, label }) => ({ value: id, label })),
      ...(legacyLabel && !mapped
        ? [{ value: legacyLabel, label: `${legacyLabel} (ancienne valeur)` }]
        : []),
    ];
  }

  private optionId(value: string, options: readonly { id: string }[]): string | null {
    return options.some(({ id }) => id === value) ? value : null;
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
      this.error.set(errorMessage(error));
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

    return this.pendingChanges.request();
  }
}

function integerValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === null || Number.isInteger(control.value) ? null : { integer: true };
}
