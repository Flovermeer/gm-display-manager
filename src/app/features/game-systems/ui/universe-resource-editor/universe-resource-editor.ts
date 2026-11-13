import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { type FormGroup, ReactiveFormsModule } from '@angular/forms';

import { CharacterRuleCatalogService } from '@app/features/game-systems/application/character-rule-catalog.service';
import { CreatureRuleCatalogService } from '@app/features/game-systems/application/creature-rule-catalog.service';
import { UniverseResourceService } from '@app/features/game-systems/application/universe-resource.service';
import { UniverseResourceEditorFacade } from '@app/features/game-systems/application/universe-resource-editor.facade';
import {
  buildCreatureSheet,
  buildPlayerSheet,
  configurationOptions,
  createCreatureForm,
  createItemForm,
  createLocationForm,
  createPlayerForm,
  creatureFormValue,
  playerFormValue,
  type EditorCatalogs,
} from '@app/features/game-systems/ui/universe-resource-editor/universe-resource-forms';
import {
  EMPTY_CHARACTER_RULE_CATALOG,
  subracesForRace,
  type CharacterRuleCatalog,
} from '@app/features/game-systems/domain/character-rule-catalog';
import {
  EMPTY_CREATURE_RULE_CATALOG,
  type CreatureRuleCatalog,
} from '@app/features/game-systems/domain/creature-rule-catalog';
import type {
  UniverseMonsterDetail,
  UniverseNpcDetail,
  UniversePlayerCharacterDetail,
  UniverseResourceDetail,
  UniverseResourceSummary,
  UniverseResourceType,
} from '@app/features/game-systems/domain/universe-resource';
import { ItemConfigurationService } from '@app/features/items/application/item-configuration.service';
import type { ItemConfigurationOption } from '@app/features/items/domain/item-configuration';
import { createEmptyNpcSheet, type NpcSheet } from '@app/features/npcs/domain/npc';
import type { RichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import { createEmptyRichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { FormField, type FormFieldOption } from '@app/shared/ui/form-field/form-field';
import { ruleFormOptions } from '@app/shared/ui/form-field/rule-form-options';
import { MultiSelectField } from '@app/shared/ui/multi-select-field/multi-select-field';
import {
  CREATURE_FEATURE_SECTIONS,
  creatureFeatureDraftsFrom,
  emptyCreatureFeatureDrafts,
  type CreatureFeatureDrafts,
  type CreatureFeatureSection,
} from '@app/shared/ui/rich-text-feature-editor/creature-feature-sections';
import { RichTextFeatureEditor } from '@app/shared/ui/rich-text-feature-editor/rich-text-feature-editor';
import { TagInput } from '@app/shared/ui/tag-input/tag-input';
import { errorMessage } from '@app/shared/error-message';
import { PendingChangesPrompt } from '@app/core/navigation/pending-changes-prompt';
import { PendingChangesDialog } from '@app/shared/ui/pending-changes-dialog/pending-changes-dialog';

const ERROR_FALLBACK = 'Impossible de modifier la ressource.';

type CreatureTagField =
  | 'savingThrows'
  | 'skills'
  | 'damageVulnerabilities'
  | 'damageResistances'
  | 'damageImmunities'
  | 'conditionImmunities'
  | 'senses';

type PlayerTagField = 'senses' | 'languages' | 'conditions';
@Component({
  selector: 'app-universe-resource-editor',
  imports: [
    PendingChangesDialog,
    ReactiveFormsModule,
    ButtonDirective,
    FormField,
    MultiSelectField,
    RichTextEditor,
    RichTextFeatureEditor,
    TagInput,
  ],
  templateUrl: './universe-resource-editor.html',
  styleUrl: './universe-resource-editor.scss',
})
export class UniverseResourceEditor {
  private readonly service = inject(UniverseResourceService);
  private readonly creatureRules = inject(CreatureRuleCatalogService);
  private readonly characterRules = inject(CharacterRuleCatalogService);
  private readonly itemConfiguration = inject(ItemConfigurationService);
  private readonly media = inject(UniverseResourceEditorFacade);
  private loadVersion = 0;

  readonly universeId = input.required<string>();
  readonly type = input.required<UniverseResourceType>();
  readonly resourceId = input<string | null>(null);
  readonly saved = output<UniverseResourceDetail>();
  readonly canceled = output<void>();

  protected readonly detail = signal<UniverseResourceDetail | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly pendingChanges = new PendingChangesPrompt();
  protected readonly primaryMediaUrl = signal<string | null>(null);
  protected readonly draftPrimaryMediaPath = signal<string | null>(null);
  protected readonly draftIdleVideoPath = signal<string | null>(null);
  protected readonly officialDescription = signal<RichTextDocument>(
    createEmptyNpcSheet().officialDescription,
  );
  protected readonly itemDescription = signal<RichTextDocument>(createEmptyRichTextDocument());
  protected readonly featureSections = CREATURE_FEATURE_SECTIONS;
  protected readonly featureDrafts = signal<CreatureFeatureDrafts>(emptyCreatureFeatureDrafts());
  protected readonly ruleCatalog = signal<CreatureRuleCatalog>(EMPTY_CREATURE_RULE_CATALOG);
  protected readonly characterRuleCatalog = signal<CharacterRuleCatalog>(
    EMPTY_CHARACTER_RULE_CATALOG,
  );
  protected readonly catalogs = computed<EditorCatalogs>(() => ({
    creature: this.ruleCatalog(),
    character: this.characterRuleCatalog(),
  }));
  protected readonly itemTypes = signal<readonly ItemConfigurationOption[]>([]);
  protected readonly itemRarities = signal<readonly ItemConfigurationOption[]>([]);
  protected readonly locationSummaries = signal<readonly UniverseResourceSummary[]>([]);

  protected readonly title = computed(() => {
    const detail = this.detail();
    return detail?.name || `Nouvelle ressource : ${resourceLabel(this.type())}`;
  });
  protected readonly sizeOptions = computed(() => ruleFormOptions(this.ruleCatalog().sizes));
  protected readonly typeOptions = computed(() =>
    ruleFormOptions(this.ruleCatalog().creatureTypes),
  );
  protected readonly alignmentOptions = computed(() =>
    ruleFormOptions(this.ruleCatalog().alignments),
  );
  protected readonly languageOptions = computed(() =>
    ruleFormOptions(this.ruleCatalog().languages),
  );
  protected readonly raceOptions = computed(() => {
    const detail = this.detail();
    const legacyLabel =
      detail?.type === 'npc' || detail?.type === 'player-character' ? detail.sheet.race : '';
    return ruleFormOptions(this.characterRuleCatalog().races, legacyLabel);
  });
  protected npcSubraceOptions(): readonly FormFieldOption[] {
    const detail = this.detail();
    return this.characterSubraceOptions(
      this.creatureForm.controls.race.value,
      detail?.type === 'npc' ? detail.sheet.subrace : '',
    );
  }
  protected playerSubraceOptions(): readonly FormFieldOption[] {
    const detail = this.detail();
    return this.characterSubraceOptions(
      this.playerForm.controls.race.value,
      detail?.type === 'player-character' ? detail.sheet.subrace : '',
    );
  }
  protected readonly classOptions = computed(() => {
    const detail = this.detail();
    const legacyLabel =
      detail?.type === 'npc' || detail?.type === 'player-character' ? detail.sheet.className : '';
    return ruleFormOptions(this.characterRuleCatalog().classes, legacyLabel);
  });
  protected readonly itemTypeOptions = computed(() => configurationOptions(this.itemTypes()));
  protected readonly itemRarityOptions = computed(() => configurationOptions(this.itemRarities()));
  protected readonly locationOptions = computed(() =>
    this.locationSummaries()
      .filter(({ id, deletedAt }) => id !== this.detail()?.id && !deletedAt)
      .map(({ id, name }) => ({ value: id, label: name })),
  );

  protected readonly creatureForm = createCreatureForm();

  protected readonly playerForm = createPlayerForm();

  protected readonly locationForm = createLocationForm();

  protected readonly itemForm = createItemForm();

  constructor() {
    effect(() => {
      const universeId = this.universeId();
      const type = this.type();
      const resourceId = this.resourceId();
      void this.initialize(universeId, type, resourceId);
    });
  }

  protected subspeciesOptions(): readonly FormFieldOption[] {
    const typeId = this.creatureForm.controls.creatureType.value;
    return ruleFormOptions(
      this.ruleCatalog().subspecies.filter(({ parentOptionId }) => parentOptionId === typeId),
    );
  }

  protected typeChanged(): void {
    const current = this.creatureForm.controls.creatureSubspecies.value;
    if (!this.subspeciesOptions().some(({ value }) => value === current)) {
      this.creatureForm.controls.creatureSubspecies.setValue('');
    }
  }

  protected npcRaceChanged(): void {
    const current = this.creatureForm.controls.subrace.value;
    const raceId = this.creatureForm.controls.race.value;
    if (
      current &&
      !subracesForRace(this.characterRuleCatalog(), raceId).some(({ id }) => id === current)
    ) {
      this.creatureForm.controls.subrace.setValue('');
    }
  }

  protected playerRaceChanged(): void {
    const current = this.playerForm.controls.subrace.value;
    const raceId = this.playerForm.controls.race.value;
    if (
      current &&
      !subracesForRace(this.characterRuleCatalog(), raceId).some(({ id }) => id === current)
    ) {
      this.playerForm.controls.subrace.setValue('');
    }
  }

  protected updateCreatureTags(field: CreatureTagField, values: readonly string[]): void {
    this.creatureForm.controls[field].setValue(values);
    this.creatureForm.controls[field].markAsDirty();
  }

  protected updateCreatureLanguages(values: readonly string[]): void {
    this.creatureForm.controls.languages.setValue(values);
    this.creatureForm.controls.languages.markAsDirty();
  }

  protected updatePlayerTags(field: PlayerTagField, values: readonly string[]): void {
    this.playerForm.controls[field].setValue(values);
    this.playerForm.controls[field].markAsDirty();
  }

  protected updateOfficialDescription(value: RichTextDocument): void {
    this.officialDescription.set(value);
    this.creatureForm.markAsDirty();
  }

  protected updateFeatureSection(
    section: CreatureFeatureSection,
    features: CreatureFeatureDrafts[CreatureFeatureSection],
  ): void {
    this.featureDrafts.update((drafts) => ({ ...drafts, [section]: features }));
    this.creatureForm.markAsDirty();
  }

  protected updateItemDescription(value: RichTextDocument): void {
    this.itemDescription.set(value);
    this.itemForm.markAsDirty();
  }

  protected async choosePrimaryMedia(): Promise<void> {
    const detail = this.detail();
    if (!detail) return;
    try {
      const imported = await this.media.importPrimaryMedia(detail.type, detail.universeId);
      if (!imported) return;
      const previousDraft = this.draftPrimaryMediaPath();
      this.draftPrimaryMediaPath.set(imported.path);
      this.primaryMediaUrl.set(imported.url);
      this.activeForm().markAsDirty();
      await this.media.discardDrafts(detail.type, { primaryMediaPath: previousDraft });
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    }
  }

  protected async chooseIdleVideo(): Promise<void> {
    const detail = this.detail();
    if (!detail || detail.type !== 'npc') return;
    try {
      const path = await this.media.importIdleVideo(detail.universeId);
      if (!path) return;
      const previousDraft = this.draftIdleVideoPath();
      this.draftIdleVideoPath.set(path);
      this.creatureForm.markAsDirty();
      await this.media.discardDrafts(detail.type, { idleVideoPath: previousDraft });
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    }
  }

  protected async save(): Promise<boolean> {
    const detail = this.detail();
    const form = this.activeForm();
    if (!detail || form.invalid || this.isSaving()) {
      form.markAllAsTouched();
      return false;
    }
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const saved = await this.media.save(detail, this.buildDetail(detail));
      this.draftPrimaryMediaPath.set(null);
      this.draftIdleVideoPath.set(null);
      this.detail.set(saved);
      form.markAsPristine();
      this.saved.emit(saved);
      return true;
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async requestCancel(): Promise<void> {
    if (await this.confirmPendingChanges()) return this.cancel();
  }

  protected continueEditing(): void {
    this.pendingChanges.resolve(false);
  }

  protected async leaveWithoutSaving(): Promise<void> {
    await this.discardDraftMedia();
    this.pendingChanges.resolve(true);
  }

  protected async saveAndLeave(): Promise<void> {
    if (await this.save()) this.pendingChanges.resolve(true);
  }

  hasPendingChanges(): boolean {
    return (
      this.activeForm().dirty ||
      this.draftPrimaryMediaPath() !== null ||
      this.draftIdleVideoPath() !== null
    );
  }

  confirmPendingChanges(): boolean | Promise<boolean> {
    if (!this.hasPendingChanges()) return true;
    return this.pendingChanges.request();
  }

  private async initialize(
    universeId: string,
    type: UniverseResourceType,
    resourceId: string | null,
  ): Promise<void> {
    const version = ++this.loadVersion;
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const supportingLoads: Promise<unknown>[] = [];
      if (type === 'npc' || type === 'monster') {
        supportingLoads.push(
          this.creatureRules
            .loadForUniverse(universeId)
            .then((catalog) => this.ruleCatalog.set(catalog)),
        );
      }
      if (type === 'npc' || type === 'player-character') {
        supportingLoads.push(
          this.characterRules
            .loadForUniverse(universeId)
            .then((catalog) => this.characterRuleCatalog.set(catalog)),
        );
      }
      if (type === 'location') {
        supportingLoads.push(
          this.service
            .list(universeId, 'location')
            .then((items) => this.locationSummaries.set(items)),
        );
      }
      if (type === 'item') {
        supportingLoads.push(
          this.itemConfiguration.ensureDefaults(universeId).then(async () => {
            const [types, rarities] = await Promise.all([
              this.itemConfiguration.list(universeId, 'type'),
              this.itemConfiguration.list(universeId, 'rarity'),
            ]);
            this.itemTypes.set(types);
            this.itemRarities.set(rarities);
          }),
        );
      }
      const [detail] = await Promise.all([
        resourceId
          ? this.service.find(universeId, type, resourceId)
          : Promise.resolve(this.service.createDraft(universeId, type)),
        ...supportingLoads,
      ]);
      if (version !== this.loadVersion) return;
      if (!detail) throw new Error('Cette ressource canonique est introuvable.');
      this.detail.set(detail);
      this.populate(detail);
      this.primaryMediaUrl.set(await this.media.primaryMediaUrl(detail));
    } catch (error) {
      if (version === this.loadVersion) this.error.set(errorMessage(error, ERROR_FALLBACK));
    } finally {
      if (version === this.loadVersion) this.isLoading.set(false);
    }
  }

  private populate(detail: UniverseResourceDetail): void {
    this.draftPrimaryMediaPath.set(null);
    this.draftIdleVideoPath.set(null);
    switch (detail.type) {
      case 'npc':
      case 'monster':
        this.populateCreature(detail);
        break;
      case 'player-character':
        this.populatePlayer(detail);
        break;
      case 'location':
        this.locationForm.reset({
          name: detail.name,
          parentLocationId: detail.parentLocationId,
          summary: detail.summary,
        });
        this.locationForm.markAsPristine();
        break;
      case 'item':
        this.itemForm.reset({
          name: detail.name,
          itemTypeId: detail.itemTypeId,
          itemRarityId: detail.itemRarityId,
          attunement: detail.attunement,
          attunementCondition: detail.attunementCondition,
          summary: detail.summary,
        });
        this.itemDescription.set(detail.description);
        this.itemForm.markAsPristine();
        break;
    }
  }

  private populateCreature(detail: UniverseNpcDetail | UniverseMonsterDetail): void {
    this.creatureForm.reset(creatureFormValue(detail, this.catalogs()));
    this.officialDescription.set(detail.sheet.officialDescription);
    this.featureDrafts.set(creatureFeatureDraftsFrom(detail.sheet));
    this.creatureForm.markAsPristine();
  }

  private populatePlayer(detail: UniversePlayerCharacterDetail): void {
    this.playerForm.reset(playerFormValue(detail, this.characterRuleCatalog()));
    this.playerForm.markAsPristine();
  }

  private buildDetail(detail: UniverseResourceDetail): UniverseResourceDetail {
    const primaryMediaPath = this.draftPrimaryMediaPath();
    switch (detail.type) {
      case 'npc':
        return {
          ...detail,
          name: this.creatureForm.controls.name.value,
          portraitPath: primaryMediaPath ?? detail.portraitPath,
          idleVideoPath: this.draftIdleVideoPath() ?? detail.idleVideoPath,
          sheet: this.buildCreatureSheet(detail.sheet, true),
        };
      case 'monster':
        return {
          ...detail,
          name: this.creatureForm.controls.name.value,
          imagePath: primaryMediaPath ?? detail.imagePath,
          sheet: this.buildCreatureSheet(detail.sheet, false),
        };
      case 'player-character':
        return this.buildPlayer(detail, primaryMediaPath);
      case 'location': {
        const value = this.locationForm.getRawValue();
        return {
          ...detail,
          name: value.name,
          parentLocationId: value.parentLocationId,
          summary: value.summary,
          imagePath: primaryMediaPath ?? detail.imagePath,
        };
      }
      case 'item': {
        const value = this.itemForm.getRawValue();
        return {
          ...detail,
          name: value.name,
          itemTypeId: value.itemTypeId,
          itemRarityId: value.itemRarityId,
          attunement: value.attunement,
          attunementCondition: value.attunement === 'conditional' ? value.attunementCondition : '',
          summary: value.summary,
          description: this.itemDescription(),
          imagePath: primaryMediaPath ?? detail.imagePath,
        };
      }
    }
  }

  private buildCreatureSheet(previous: NpcSheet, isNpc: boolean): NpcSheet {
    return buildCreatureSheet(this.creatureForm.getRawValue(), previous, isNpc, this.catalogs(), {
      officialDescription: this.officialDescription(),
      features: this.featureDrafts(),
    });
  }

  private buildPlayer(
    detail: UniversePlayerCharacterDetail,
    primaryMediaPath: string | null,
  ): UniversePlayerCharacterDetail {
    const value = this.playerForm.getRawValue();
    const sheet = buildPlayerSheet(value, this.characterRuleCatalog());
    return {
      ...detail,
      name: value.name,
      maxHitPoints: value.maxHitPoints,
      portraitPath: primaryMediaPath ?? detail.portraitPath,
      sheet,
    };
  }

  private characterSubraceOptions(raceId: string, legacyLabel: string): readonly FormFieldOption[] {
    return ruleFormOptions(subracesForRace(this.characterRuleCatalog(), raceId), legacyLabel);
  }

  private activeForm(): FormGroup {
    switch (this.type()) {
      case 'npc':
      case 'monster':
        return this.creatureForm;
      case 'player-character':
        return this.playerForm;
      case 'location':
        return this.locationForm;
      case 'item':
        return this.itemForm;
    }
  }

  private async discardDraftMedia(): Promise<void> {
    const detail = this.detail();
    const primaryMediaPath = this.draftPrimaryMediaPath();
    const idleVideoPath = this.draftIdleVideoPath();
    this.draftPrimaryMediaPath.set(null);
    this.draftIdleVideoPath.set(null);
    if (detail) await this.media.discardDrafts(detail.type, { primaryMediaPath, idleVideoPath });
  }

  private cancel(): void {
    this.canceled.emit();
  }
}

function resourceLabel(type: UniverseResourceType): string {
  return {
    npc: 'PNJ',
    'player-character': 'PJ',
    location: 'lieu',
    item: 'objet',
    monster: 'monstre',
  }[type];
}
