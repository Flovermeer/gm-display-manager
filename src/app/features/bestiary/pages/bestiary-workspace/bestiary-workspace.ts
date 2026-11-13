import { Component, computed, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { CombatStore } from '@app/features/combat/application/combat.store';
import { monsterCombatantSource } from '@app/features/combat/domain/combatant-source';
import { MonsterService } from '@app/features/bestiary/application/monster.service';
import { MonsterImageGateway } from '@app/features/bestiary/data-access/monster-image.gateway';
import {
  createEmptyMonsterSheet,
  type Monster,
  type MonsterSheet,
} from '@app/features/bestiary/domain/monster';
import type { RichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { EmptyState } from '@app/shared/ui/empty-state/empty-state';
import { FormField } from '@app/shared/ui/form-field/form-field';
import { TagInput } from '@app/shared/ui/tag-input/tag-input';
import { RichTextFeatureEditor } from '@app/shared/ui/rich-text-feature-editor/rich-text-feature-editor';
import { RichTextFeatureSection } from '@app/shared/ui/rich-text-feature-section/rich-text-feature-section';
import {
  CREATURE_FEATURE_SECTIONS,
  creatureFeatureDraftsFrom,
  emptyCreatureFeatureDrafts,
  type CreatureFeatureDrafts,
  type CreatureFeatureSection,
} from '@app/shared/ui/rich-text-feature-editor/creature-feature-sections';
import type { PendingChangesAware } from '@app/core/navigation/pending-changes.guard';
import { JournalEntryList } from '@app/features/journal/ui/journal-entry-list/journal-entry-list';
import { RecentResourceTrackerDirective } from '@app/features/recent-resources/ui/recent-resource-tracker.directive';
import { RecentResourceStore } from '@app/features/recent-resources/application/recent-resource.store';
import { CreatureRuleCatalogService } from '@app/features/game-systems/application/creature-rule-catalog.service';
import {
  EMPTY_CREATURE_RULE_CATALOG,
  optionIdFor,
  optionLabel,
  type CreatureRuleCatalog,
} from '@app/features/game-systems/domain/creature-rule-catalog';
import type { FormFieldOption } from '@app/shared/ui/form-field/form-field';
import { MultiSelectField } from '@app/shared/ui/multi-select-field/multi-select-field';
import { ResourceMentionDisplayGateway } from '@app/shared/rich-text-editor/resource-mention-display.gateway';
import type { ResourceMentionCandidate } from '@app/shared/rich-text-editor/resource-mention';
import { errorMessage } from '@app/shared/error-message';

const ERROR_FALLBACK = 'Impossible de gérer le bestiaire.';

type TagField =
  | 'savingThrows'
  | 'skills'
  | 'damageVulnerabilities'
  | 'damageResistances'
  | 'damageImmunities'
  | 'conditionImmunities'
  | 'senses';

type PendingDecisionResolver = (canLeave: boolean) => void;

@Component({
  selector: 'app-bestiary-workspace',
  imports: [
    ReactiveFormsModule,
    ButtonDirective,
    Dialog,
    EmptyState,
    FormField,
    JournalEntryList,
    RichTextEditor,
    RichTextFeatureEditor,
    RichTextFeatureSection,
    TagInput,
    MultiSelectField,
    RecentResourceTrackerDirective,
  ],
  templateUrl: './bestiary-workspace.html',
  styleUrl: './bestiary-workspace.scss',
})
export class BestiaryWorkspace implements OnInit, PendingChangesAware {
  private readonly context = inject(CampaignContext);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(MonsterService);
  private readonly imageGateway = inject(MonsterImageGateway);
  private readonly creatureRules = inject(CreatureRuleCatalogService);
  private readonly combat = inject(CombatStore, { optional: true });
  private readonly recentResources = inject(RecentResourceStore, { optional: true });
  private readonly mentionDisplay = inject(ResourceMentionDisplayGateway, { optional: true });
  private readonly journalEntries = viewChild<JournalEntryList>(JournalEntryList);
  private pendingDecisionResolver?: PendingDecisionResolver;

  protected readonly campaign = this.context.campaign;
  protected readonly monsters = signal<readonly Monster[]>([]);
  protected readonly availableMonsters = signal<readonly Monster[]>([]);
  protected readonly selectedMonster = signal<Monster | null>(null);
  protected readonly monsterPendingDetachment = signal<Monster | null>(null);
  protected readonly monsterPendingPromotion = signal<Monster | null>(null);
  protected readonly monsterPendingReset = signal<Monster | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly isSidebarCollapsed = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly isCatalogOpen = signal(false);
  protected readonly showPendingChangesDialog = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly focusedJournalEntryId = signal<string | null>(null);
  protected readonly draftImagePath = signal<string | null>(null);
  protected readonly imageUrl = signal<string | null>(null);
  protected readonly officialDescription = signal<RichTextDocument>(
    createEmptyMonsterSheet().officialDescription,
  );
  protected readonly featureSections = CREATURE_FEATURE_SECTIONS;
  protected readonly featureDrafts = signal<CreatureFeatureDrafts>(emptyCreatureFeatureDrafts());
  protected readonly ruleCatalog = signal<CreatureRuleCatalog>(EMPTY_CREATURE_RULE_CATALOG);
  protected readonly sizeOptions = computed(() => this.formOptions(this.ruleCatalog().sizes));
  protected readonly typeOptions = computed(() =>
    this.formOptions(this.ruleCatalog().creatureTypes),
  );
  protected readonly alignmentOptions = computed(() =>
    this.formOptions(this.ruleCatalog().alignments),
  );
  protected subspeciesOptions(): readonly FormFieldOption[] {
    const typeId = this.monsterForm.controls.creatureType.value;
    return this.formOptions(
      this.ruleCatalog().subspecies.filter(({ parentOptionId }) => parentOptionId === typeId),
    );
  }
  protected readonly languageOptions = computed(() =>
    this.formOptions(this.ruleCatalog().languages),
  );
  protected readonly filteredMonsters = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('fr');
    if (!term) return this.monsters();
    return this.monsters().filter((monster) =>
      [monster.name, monster.sheet.creatureType, monster.sheet.challengeRating].some((value) =>
        value.toLocaleLowerCase('fr').includes(term),
      ),
    );
  });
  protected readonly monsterForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    size: new FormControl('', { nonNullable: true }),
    creatureType: new FormControl('', { nonNullable: true }),
    creatureSubspecies: new FormControl('', { nonNullable: true }),
    alignment: new FormControl('', { nonNullable: true }),
    armorClass: new FormControl<number | null>(null, [Validators.min(0)]),
    armorClassDetails: new FormControl('', { nonNullable: true }),
    hitPoints: new FormControl<number | null>(null, [Validators.min(0)]),
    hitPointFormula: new FormControl('', { nonNullable: true }),
    speed: new FormControl('', { nonNullable: true }),
    strength: new FormControl<number | null>(null, [Validators.min(0)]),
    dexterity: new FormControl<number | null>(null, [Validators.min(0)]),
    constitution: new FormControl<number | null>(null, [Validators.min(0)]),
    intelligence: new FormControl<number | null>(null, [Validators.min(0)]),
    wisdom: new FormControl<number | null>(null, [Validators.min(0)]),
    charisma: new FormControl<number | null>(null, [Validators.min(0)]),
    savingThrows: new FormControl<readonly string[]>([], { nonNullable: true }),
    skills: new FormControl<readonly string[]>([], { nonNullable: true }),
    damageVulnerabilities: new FormControl<readonly string[]>([], { nonNullable: true }),
    damageResistances: new FormControl<readonly string[]>([], { nonNullable: true }),
    damageImmunities: new FormControl<readonly string[]>([], { nonNullable: true }),
    conditionImmunities: new FormControl<readonly string[]>([], { nonNullable: true }),
    senses: new FormControl<readonly string[]>([], { nonNullable: true }),
    languages: new FormControl<readonly string[]>([], { nonNullable: true }),
    challengeRating: new FormControl('', { nonNullable: true }),
    experiencePoints: new FormControl<number | null>(null, [Validators.min(0)]),
  });

  protected addToCombat(monster: Monster): void {
    void this.combat?.requestAdd(monsterCombatantSource(monster));
  }

  protected isMonsterDisplayed(monster: Monster): boolean {
    return this.mentionDisplay?.isDisplayed(this.displayCandidate(monster)) ?? false;
  }

  protected canShowMonster(monster: Monster): boolean {
    return Boolean(
      monster.imagePath &&
      this.mentionDisplay?.isPlayerDisplayOpen() &&
      !this.mentionDisplay.isPublishing(),
    );
  }

  protected async showMonsterOnPlayerDisplay(monster: Monster): Promise<void> {
    try {
      await this.mentionDisplay?.display(this.displayCandidate(monster));
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    }
  }

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (params) => void this.openRequestedMonster(params.get('resourceId'), params.get('entryId')),
      );
    void this.initialize();
    void this.mentionDisplay?.refreshPlayerDisplayStatus();
  }

  canDeactivate(): boolean | Promise<boolean> {
    return this.confirmPendingChanges();
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected async selectMonster(monster: Monster): Promise<void> {
    if (!(await this.confirmPendingChanges())) return;
    await this.discardDraftImageSafely();
    this.isEditing.set(false);
    this.isCreating.set(false);
    this.isCatalogOpen.set(false);
    this.focusedJournalEntryId.set(null);
    this.openReadOnly(monster);
  }

  protected async createMonster(): Promise<void> {
    if (!(await this.confirmPendingChanges())) return;
    await this.discardDraftImageSafely();
    this.selectedMonster.set(null);
    this.isCatalogOpen.set(false);
    this.isCreating.set(true);
    this.isEditing.set(true);
    this.draftImagePath.set(null);
    this.imageUrl.set(null);
    this.populateForm(null);
  }

  protected editMonster(): void {
    const monster = this.selectedMonster();
    if (!monster) return;
    this.isCreating.set(false);
    this.isEditing.set(true);
    this.populateForm(monster);
  }

  protected async cancelEditing(): Promise<void> {
    await this.discardDraftImageSafely();
    this.isEditing.set(false);
    this.isCreating.set(false);
    const monster = this.selectedMonster();
    if (monster) this.populateForm(monster);
  }

  protected async saveMonster(): Promise<boolean> {
    const campaign = this.campaign();
    if (!campaign || this.monsterForm.invalid || this.isSaving()) {
      this.monsterForm.markAllAsTouched();
      return false;
    }
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const previousImagePath = this.selectedMonster()?.imagePath ?? null;
      const importedImagePath = this.draftImagePath();
      const input = {
        name: this.monsterForm.controls.name.value,
        imagePath: importedImagePath ?? previousImagePath,
        sheet: this.buildSheet(),
      };
      const saved = this.isCreating()
        ? await this.service.create(campaign.id, input)
        : await this.service.update(this.selectedMonster()!, input);
      this.selectedMonster.set(saved);
      this.isCreating.set(false);
      this.isEditing.set(false);
      this.draftImagePath.set(null);
      if (importedImagePath && previousImagePath && previousImagePath !== importedImagePath) {
        await this.discardImageSafely(previousImagePath);
      }
      await this.load(saved.id);
      return true;
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async chooseImage(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    try {
      const path = await this.imageGateway.chooseAndImport(campaign.universeId);
      if (!path) return;
      const previous = this.draftImagePath();
      this.draftImagePath.set(path);
      this.imageUrl.set(await this.imageGateway.resolveUrl(path));
      this.monsterForm.markAsDirty();
      if (previous) await this.imageGateway.discard(previous);
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    }
  }

  protected async openCatalog(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    if (!(await this.confirmPendingChanges())) return;
    await this.discardDraftImageSafely();
    this.availableMonsters.set(await this.service.listAvailable(campaign.id));
    this.isCatalogOpen.set(true);
    this.isEditing.set(false);
    this.isCreating.set(false);
  }

  protected closeCatalog(): void {
    this.isCatalogOpen.set(false);
  }

  protected updateOfficialDescription(value: RichTextDocument): void {
    this.officialDescription.set(value);
    this.monsterForm.markAsDirty();
  }

  protected async attachMonster(monster: Monster): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    await this.service.attach(campaign.id, monster.id);
    await this.load(monster.id);
    this.isCatalogOpen.set(false);
  }

  protected requestDetach(monster: Monster): void {
    this.monsterPendingDetachment.set(monster);
  }

  protected async confirmDetach(): Promise<void> {
    const monster = this.monsterPendingDetachment();
    if (!monster) return;
    if (this.isMonsterDisplayed(monster)) {
      await this.mentionDisplay?.display(this.displayCandidate(monster));
    }
    await this.service.detach(monster);
    await this.recentResources?.remove('monster', monster.id);
    this.monsterPendingDetachment.set(null);
    this.selectedMonster.set(null);
    await this.load();
  }

  protected cancelDetach(): void {
    this.monsterPendingDetachment.set(null);
  }

  protected requestPromotion(monster: Monster): void {
    this.monsterPendingPromotion.set(monster);
  }

  protected async confirmPromotion(): Promise<void> {
    const monster = this.monsterPendingPromotion();
    if (!monster) return;
    await this.service.promote(monster);
    this.monsterPendingPromotion.set(null);
    await this.load(monster.id);
  }

  protected requestReset(monster: Monster): void {
    this.monsterPendingReset.set(monster);
  }

  protected async confirmReset(): Promise<void> {
    const monster = this.monsterPendingReset();
    if (!monster) return;
    await this.service.resetOverride(monster);
    this.monsterPendingReset.set(null);
    await this.load(monster.id);
  }

  protected continueEditing(): void {
    this.resolvePendingDecision(false);
  }

  protected async leaveWithoutSaving(): Promise<void> {
    if (this.journalEntries()?.hasPendingChanges()) this.journalEntries()?.discardPendingChanges();
    await this.discardDraftImageSafely();
    this.isEditing.set(false);
    this.isCreating.set(false);
    this.resolvePendingDecision(true);
  }

  protected async saveAndLeave(): Promise<void> {
    const saved = this.journalEntries()?.hasPendingChanges()
      ? await this.journalEntries()!.savePendingChanges()
      : await this.saveMonster();
    if (saved) this.resolvePendingDecision(true);
  }

  protected updateTags(field: TagField, values: readonly string[]): void {
    this.monsterForm.controls[field].setValue(values);
    this.monsterForm.controls[field].markAsDirty();
  }

  protected updateLanguages(values: readonly string[]): void {
    this.monsterForm.controls.languages.setValue(values);
    this.monsterForm.controls.languages.markAsDirty();
  }

  protected typeChanged(): void {
    const current = this.monsterForm.controls.creatureSubspecies.value;
    if (!this.subspeciesOptions().some(({ value }) => value === current)) {
      this.monsterForm.controls.creatureSubspecies.setValue('');
    }
  }

  protected updateFeatureSection(
    section: CreatureFeatureSection,
    features: CreatureFeatureDrafts[CreatureFeatureSection],
  ): void {
    this.featureDrafts.update((drafts) => ({ ...drafts, [section]: features }));
    this.monsterForm.markAsDirty();
  }

  protected abilityModifier(score: number | null): string {
    if (score === null) return '—';
    const modifier = Math.floor((score - 10) / 2);
    return `${modifier >= 0 ? '+' : ''}${modifier}`;
  }

  protected typeLine(sheet: MonsterSheet): string {
    return (
      [sheet.size, sheet.creatureType, sheet.alignment].filter(Boolean).join(', ') ||
      'Type non renseigné'
    );
  }

  private async load(selectedId?: string): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    try {
      const monsters = await this.service.list(campaign.id);
      this.monsters.set(monsters);
      const selected = monsters.find(({ id }) => id === selectedId) ?? this.selectedMonster();
      if (selected && monsters.some(({ id }) => id === selected.id)) {
        this.selectedMonster.set(selected);
        await this.resolveImage(selected.imagePath);
      }
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async initialize(): Promise<void> {
    try {
      if (!(await this.context.load())) return;
      await this.loadRuleCatalog();
      await this.load();
      await this.openRequestedMonster(
        this.route.snapshot.queryParamMap.get('resourceId'),
        this.route.snapshot.queryParamMap.get('entryId'),
      );
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async openRequestedMonster(
    resourceId: string | null,
    entryId: string | null,
  ): Promise<void> {
    const requested = this.monsters().find(({ id }) => id === resourceId);
    if (!requested) return;
    if (requested.id === this.selectedMonster()?.id) {
      this.focusedJournalEntryId.set(entryId);
      return;
    }
    if (!(await this.confirmPendingChanges())) return;
    this.focusedJournalEntryId.set(entryId);
    this.openReadOnly(requested);
  }

  private openReadOnly(monster: Monster): void {
    const refreshed = this.monsters().find(({ id }) => id === monster.id) ?? monster;
    this.selectedMonster.set(refreshed);
    this.isCreating.set(false);
    this.isEditing.set(false);
    this.isCatalogOpen.set(false);
    this.populateForm(refreshed);
    void this.resolveImage(refreshed.imagePath);
  }

  private populateForm(monster: Monster | null): void {
    const sheet = monster?.sheet ?? createEmptyMonsterSheet();
    this.monsterForm.reset({
      name: monster?.name ?? '',
      size: optionIdFor(sheet.sizeOptionId, sheet.size, this.ruleCatalog().sizes),
      creatureType: optionIdFor(
        sheet.creatureTypeOptionId,
        sheet.creatureType,
        this.ruleCatalog().creatureTypes,
      ),
      creatureSubspecies: optionIdFor(
        sheet.creatureSubspeciesOptionId,
        sheet.creatureSubspecies,
        this.ruleCatalog().subspecies,
      ),
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
    this.officialDescription.set(sheet.officialDescription);
    this.featureDrafts.set(creatureFeatureDraftsFrom(sheet));
    this.monsterForm.markAsPristine();
  }

  private buildSheet(): MonsterSheet {
    const value = this.monsterForm.getRawValue();
    const previous = this.selectedMonster()?.sheet ?? createEmptyMonsterSheet();
    return {
      ...previous,
      sizeOptionId: value.size || null,
      size: optionLabel(value.size, this.ruleCatalog().sizes, previous.size),
      creatureTypeOptionId: value.creatureType || null,
      creatureType: optionLabel(
        value.creatureType,
        this.ruleCatalog().creatureTypes,
        previous.creatureType,
      ),
      creatureSubspeciesOptionId: value.creatureSubspecies || null,
      creatureSubspecies: optionLabel(value.creatureSubspecies, this.ruleCatalog().subspecies, ''),
      alignmentOptionId: value.alignment || null,
      alignment: optionLabel(value.alignment, this.ruleCatalog().alignments, previous.alignment),
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
      officialDescription: this.officialDescription(),
      ...this.featureDrafts(),
    };
  }

  private async loadRuleCatalog(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    this.ruleCatalog.set(await this.creatureRules.loadForUniverse(campaign.universeId));
  }

  private formOptions(
    options: readonly { id: string; label: string }[],
  ): readonly FormFieldOption[] {
    return options.map(({ id, label }) => ({ value: id, label }));
  }

  private async resolveImage(path: string | null): Promise<void> {
    this.imageUrl.set(path ? await this.imageGateway.resolveUrl(path) : null);
  }

  private async discardDraftImageSafely(): Promise<void> {
    const path = this.draftImagePath();
    this.draftImagePath.set(null);
    if (!path) return;
    await this.discardImageSafely(path);
  }

  private async discardImageSafely(path: string): Promise<void> {
    try {
      await this.imageGateway.discard(path);
    } catch {
      // Le nettoyage ne doit pas empêcher le MJ d'abandonner un brouillon.
    }
  }

  private hasPendingChanges(): boolean {
    return (
      (this.isEditing() && (this.monsterForm.dirty || this.draftImagePath() !== null)) ||
      (this.journalEntries()?.hasPendingChanges() ?? false)
    );
  }

  private confirmPendingChanges(): boolean | Promise<boolean> {
    if (!this.hasPendingChanges()) return true;
    if (this.pendingDecisionResolver) return false;
    this.showPendingChangesDialog.set(true);
    return new Promise((resolve) => (this.pendingDecisionResolver = resolve));
  }

  private resolvePendingDecision(value: boolean): void {
    const resolve = this.pendingDecisionResolver;
    this.pendingDecisionResolver = undefined;
    this.showPendingChangesDialog.set(false);
    resolve?.(value);
  }

  private displayCandidate(monster: Monster): ResourceMentionCandidate {
    return {
      resourceType: 'monster' as const,
      resourceId: monster.id,
      label: monster.name,
      playerDisplayAvailable: Boolean(monster.imagePath),
      playerDisplayImagePath: monster.imagePath ?? undefined,
    };
  }
}
