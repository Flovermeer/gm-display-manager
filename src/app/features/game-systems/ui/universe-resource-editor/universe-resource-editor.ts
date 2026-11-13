import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MonsterImageGateway } from '@app/features/bestiary/data-access/monster-image.gateway';
import { CharacterRuleCatalogService } from '@app/features/game-systems/application/character-rule-catalog.service';
import { CreatureRuleCatalogService } from '@app/features/game-systems/application/creature-rule-catalog.service';
import { UniverseResourceService } from '@app/features/game-systems/application/universe-resource.service';
import {
  EMPTY_CHARACTER_RULE_CATALOG,
  subracesForRace,
  type CharacterRuleCatalog,
} from '@app/features/game-systems/domain/character-rule-catalog';
import {
  EMPTY_CREATURE_RULE_CATALOG,
  optionIdFor,
  optionLabel,
  type CreatureRuleCatalog,
} from '@app/features/game-systems/domain/creature-rule-catalog';
import type {
  UniverseLocationDetail,
  UniverseMonsterDetail,
  UniverseNarrativeItemDetail,
  UniverseNpcDetail,
  UniversePlayerCharacterDetail,
  UniverseResourceDetail,
  UniverseResourceSummary,
  UniverseResourceType,
} from '@app/features/game-systems/domain/universe-resource';
import { ItemConfigurationService } from '@app/features/items/application/item-configuration.service';
import { ItemImageGateway } from '@app/features/items/data-access/item-image.gateway';
import type { ItemConfigurationOption } from '@app/features/items/domain/item-configuration';
import { LocationImageGateway } from '@app/features/locations/data-access/location-image.gateway';
import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';
import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';
import { createEmptyNpcSheet, type NpcSheet } from '@app/features/npcs/domain/npc';
import { PlayerCharacterPortraitGateway } from '@app/features/players/data-access/player-character-portrait.gateway';
import type { PlayerCharacterSheet } from '@app/features/players/domain/player-character';
import type { RichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import { createEmptyRichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { FormField, type FormFieldOption } from '@app/shared/ui/form-field/form-field';
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
type PendingDecisionResolver = (canLeave: boolean) => void;

@Component({
  selector: 'app-universe-resource-editor',
  imports: [
    ReactiveFormsModule,
    ButtonDirective,
    Dialog,
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
  private readonly npcPortraits = inject(NpcPortraitGateway);
  private readonly npcVideos = inject(NpcIdleVideoGateway);
  private readonly playerPortraits = inject(PlayerCharacterPortraitGateway);
  private readonly locationImages = inject(LocationImageGateway);
  private readonly itemImages = inject(ItemImageGateway);
  private readonly monsterImages = inject(MonsterImageGateway);
  private loadVersion = 0;
  private pendingDecisionResolver?: PendingDecisionResolver;

  readonly universeId = input.required<string>();
  readonly type = input.required<UniverseResourceType>();
  readonly resourceId = input<string | null>(null);
  readonly saved = output<UniverseResourceDetail>();
  readonly canceled = output<void>();

  protected readonly detail = signal<UniverseResourceDetail | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPendingChangesDialog = signal(false);
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
  protected readonly itemTypes = signal<readonly ItemConfigurationOption[]>([]);
  protected readonly itemRarities = signal<readonly ItemConfigurationOption[]>([]);
  protected readonly locationSummaries = signal<readonly UniverseResourceSummary[]>([]);

  protected readonly title = computed(() => {
    const detail = this.detail();
    return detail?.name || `Nouvelle ressource : ${resourceLabel(this.type())}`;
  });
  protected readonly sizeOptions = computed(() => formOptions(this.ruleCatalog().sizes));
  protected readonly typeOptions = computed(() => formOptions(this.ruleCatalog().creatureTypes));
  protected readonly alignmentOptions = computed(() => formOptions(this.ruleCatalog().alignments));
  protected readonly languageOptions = computed(() => formOptions(this.ruleCatalog().languages));
  protected readonly raceOptions = computed(() => {
    const detail = this.detail();
    const legacyLabel =
      detail?.type === 'npc' || detail?.type === 'player-character' ? detail.sheet.race : '';
    return formOptions(this.characterRuleCatalog().races, legacyLabel);
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
    return formOptions(this.characterRuleCatalog().classes, legacyLabel);
  });
  protected readonly itemTypeOptions = computed(() => configurationOptions(this.itemTypes()));
  protected readonly itemRarityOptions = computed(() => configurationOptions(this.itemRarities()));
  protected readonly locationOptions = computed(() =>
    this.locationSummaries()
      .filter(({ id, deletedAt }) => id !== this.detail()?.id && !deletedAt)
      .map(({ id, name }) => ({ value: id, label: name })),
  );

  protected readonly creatureForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    size: new FormControl('', { nonNullable: true }),
    creatureType: new FormControl('', { nonNullable: true }),
    creatureSubspecies: new FormControl('', { nonNullable: true }),
    race: new FormControl('', { nonNullable: true }),
    subrace: new FormControl('', { nonNullable: true }),
    className: new FormControl('', { nonNullable: true }),
    occupation: new FormControl('', { nonNullable: true }),
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

  protected readonly playerForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    maxHitPoints: new FormControl<number | null>(null, [Validators.min(0)]),
    race: new FormControl('', { nonNullable: true }),
    subrace: new FormControl('', { nonNullable: true }),
    className: new FormControl('', { nonNullable: true }),
    level: new FormControl<number | null>(null, [Validators.min(1), Validators.max(20)]),
    armorClass: new FormControl<number | null>(null, [Validators.min(0)]),
    speed: new FormControl<number | null>(null, [Validators.min(0)]),
    passivePerception: new FormControl<number | null>(null, [Validators.min(0)]),
    passiveInsight: new FormControl<number | null>(null, [Validators.min(0)]),
    passiveInvestigation: new FormControl<number | null>(null, [Validators.min(0)]),
    senses: new FormControl<readonly string[]>([], { nonNullable: true }),
    languages: new FormControl<readonly string[]>([], { nonNullable: true }),
    conditions: new FormControl<readonly string[]>([], { nonNullable: true }),
    exhaustionLevel: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(6)],
    }),
  });

  protected readonly locationForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    parentLocationId: new FormControl<string | null>(null),
    summary: new FormControl('', { nonNullable: true }),
  });

  protected readonly itemForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    itemTypeId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    itemRarityId: new FormControl<string | null>(null),
    attunement: new FormControl<UniverseNarrativeItemDetail['attunement']>('none', {
      nonNullable: true,
    }),
    attunementCondition: new FormControl('', { nonNullable: true }),
    summary: new FormControl('', { nonNullable: true }),
  });

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
    return formOptions(
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
      const selection = await this.primaryGateway(detail.type).chooseAndImport(detail.universeId);
      if (!selection) return;
      const path = typeof selection === 'string' ? selection : (selection[0] ?? null);
      if (!path) return;
      if (typeof selection !== 'string') {
        for (const unusedPath of selection.slice(1)) {
          await this.locationImages.discard(unusedPath);
        }
      }
      const previousDraft = this.draftPrimaryMediaPath();
      this.draftPrimaryMediaPath.set(path);
      this.primaryMediaUrl.set(await this.primaryGateway(detail.type).resolveUrl(path));
      this.activeForm().markAsDirty();
      if (previousDraft) await this.primaryGateway(detail.type).discard(previousDraft);
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    }
  }

  protected async chooseIdleVideo(): Promise<void> {
    const detail = this.detail();
    if (!detail || detail.type !== 'npc') return;
    try {
      const path = await this.npcVideos.chooseAndImport(detail.universeId);
      if (!path) return;
      const previousDraft = this.draftIdleVideoPath();
      this.draftIdleVideoPath.set(path);
      this.creatureForm.markAsDirty();
      if (previousDraft) await this.npcVideos.discard(previousDraft);
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
      const saved = await this.service.save(this.buildDetail(detail));
      await this.discardReplacedMedia(detail, saved);
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
    this.resolvePendingDecision(false);
  }

  protected async leaveWithoutSaving(): Promise<void> {
    await this.discardDraftMedia();
    this.resolvePendingDecision(true);
  }

  protected async saveAndLeave(): Promise<void> {
    if (await this.save()) this.resolvePendingDecision(true);
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
    if (this.pendingDecisionResolver) return false;
    this.showPendingChangesDialog.set(true);
    return new Promise((resolve) => (this.pendingDecisionResolver = resolve));
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
      await this.resolvePrimaryMedia(detail);
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
    const sheet = detail.sheet;
    this.creatureForm.reset({
      name: detail.name,
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
      languages: sheet.languageOptionIds,
      challengeRating: sheet.challengeRating,
      experiencePoints: sheet.experiencePoints,
    });
    this.officialDescription.set(sheet.officialDescription);
    this.featureDrafts.set(creatureFeatureDraftsFrom(sheet));
    this.creatureForm.markAsPristine();
  }

  private populatePlayer(detail: UniversePlayerCharacterDetail): void {
    this.playerForm.reset({
      name: detail.name,
      maxHitPoints: detail.maxHitPoints,
      race:
        optionIdFor(
          detail.sheet.raceOptionId,
          detail.sheet.race,
          this.characterRuleCatalog().races,
        ) || detail.sheet.race,
      subrace:
        optionIdFor(
          detail.sheet.subraceOptionId,
          detail.sheet.subrace,
          this.characterRuleCatalog().subraces,
        ) || detail.sheet.subrace,
      className:
        optionIdFor(
          detail.sheet.classOptionId,
          detail.sheet.className,
          this.characterRuleCatalog().classes,
        ) || detail.sheet.className,
      level: detail.sheet.level,
      armorClass: detail.sheet.armorClass,
      speed: detail.sheet.speed,
      passivePerception: detail.sheet.passivePerception,
      passiveInsight: detail.sheet.passiveInsight,
      passiveInvestigation: detail.sheet.passiveInvestigation,
      senses: detail.sheet.senses,
      languages: detail.sheet.languages,
      conditions: detail.sheet.conditions,
      exhaustionLevel: detail.sheet.exhaustionLevel,
    });
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
    const value = this.creatureForm.getRawValue();
    return {
      ...previous,
      sizeOptionId: value.size || null,
      size: optionLabel(value.size, this.ruleCatalog().sizes, previous.size),
      creatureTypeOptionId: isNpc ? previous.creatureTypeOptionId : value.creatureType || null,
      creatureType: optionLabel(
        isNpc ? '' : value.creatureType,
        this.ruleCatalog().creatureTypes,
        previous.creatureType,
      ),
      creatureSubspeciesOptionId: isNpc
        ? previous.creatureSubspeciesOptionId
        : value.creatureSubspecies || null,
      creatureSubspecies: isNpc
        ? previous.creatureSubspecies
        : optionLabel(value.creatureSubspecies, this.ruleCatalog().subspecies, ''),
      raceOptionId: isNpc
        ? optionId(value.race, this.characterRuleCatalog().races)
        : previous.raceOptionId,
      race: isNpc
        ? optionLabel(value.race, this.characterRuleCatalog().races, value.race)
        : previous.race,
      subraceOptionId: isNpc
        ? optionId(value.subrace, this.characterRuleCatalog().subraces)
        : previous.subraceOptionId,
      subrace: isNpc
        ? optionLabel(value.subrace, this.characterRuleCatalog().subraces, value.subrace)
        : previous.subrace,
      classOptionId: isNpc
        ? optionId(value.className, this.characterRuleCatalog().classes)
        : previous.classOptionId,
      className: isNpc
        ? optionLabel(value.className, this.characterRuleCatalog().classes, value.className)
        : previous.className,
      occupation: isNpc ? value.occupation : previous.occupation,
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

  private buildPlayer(
    detail: UniversePlayerCharacterDetail,
    primaryMediaPath: string | null,
  ): UniversePlayerCharacterDetail {
    const value = this.playerForm.getRawValue();
    const sheet: PlayerCharacterSheet = {
      raceOptionId: optionId(value.race, this.characterRuleCatalog().races),
      race: optionLabel(value.race, this.characterRuleCatalog().races, value.race),
      subraceOptionId: optionId(value.subrace, this.characterRuleCatalog().subraces),
      subrace: optionLabel(value.subrace, this.characterRuleCatalog().subraces, value.subrace),
      classOptionId: optionId(value.className, this.characterRuleCatalog().classes),
      className: optionLabel(value.className, this.characterRuleCatalog().classes, value.className),
      level: value.level,
      armorClass: value.armorClass,
      speed: value.speed,
      passivePerception: value.passivePerception,
      passiveInsight: value.passiveInsight,
      passiveInvestigation: value.passiveInvestigation,
      senses: value.senses,
      languages: value.languages,
      conditions: value.conditions,
      exhaustionLevel: value.exhaustionLevel,
      privateNotes: '',
    };
    return {
      ...detail,
      name: value.name,
      maxHitPoints: value.maxHitPoints,
      portraitPath: primaryMediaPath ?? detail.portraitPath,
      sheet,
    };
  }

  private characterSubraceOptions(raceId: string, legacyLabel: string): readonly FormFieldOption[] {
    return formOptions(subracesForRace(this.characterRuleCatalog(), raceId), legacyLabel);
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

  private primaryGateway(type: UniverseResourceType) {
    switch (type) {
      case 'npc':
        return this.npcPortraits;
      case 'player-character':
        return this.playerPortraits;
      case 'location':
        return this.locationImages;
      case 'item':
        return this.itemImages;
      case 'monster':
        return this.monsterImages;
    }
  }

  private async resolvePrimaryMedia(detail: UniverseResourceDetail): Promise<void> {
    const path =
      detail.type === 'npc'
        ? detail.portraitPath
        : detail.type === 'player-character'
          ? detail.portraitPath
          : detail.type === 'location' || detail.type === 'item' || detail.type === 'monster'
            ? detail.imagePath
            : null;
    this.primaryMediaUrl.set(path ? await this.primaryGateway(detail.type).resolveUrl(path) : null);
  }

  private async discardReplacedMedia(
    previous: UniverseResourceDetail,
    saved: UniverseResourceDetail,
  ): Promise<void> {
    const previousPrimary = primaryPath(previous);
    const savedPrimary = primaryPath(saved);
    if (previous.type !== 'location' && previousPrimary && savedPrimary !== previousPrimary) {
      await this.discardSafely(this.primaryGateway(previous.type), previousPrimary);
    }
    if (
      previous.type === 'npc' &&
      saved.type === 'npc' &&
      previous.idleVideoPath &&
      previous.idleVideoPath !== saved.idleVideoPath
    ) {
      await this.discardSafely(this.npcVideos, previous.idleVideoPath);
    }
  }

  private async discardDraftMedia(): Promise<void> {
    const detail = this.detail();
    const primary = this.draftPrimaryMediaPath();
    const video = this.draftIdleVideoPath();
    this.draftPrimaryMediaPath.set(null);
    this.draftIdleVideoPath.set(null);
    if (detail && primary) await this.discardSafely(this.primaryGateway(detail.type), primary);
    if (video) await this.discardSafely(this.npcVideos, video);
  }

  private async discardSafely(
    gateway: Readonly<{ discard(path: string): Promise<void> }>,
    path: string,
  ): Promise<void> {
    try {
      await gateway.discard(path);
    } catch {
      // Le nettoyage d'un brouillon ne doit pas bloquer la navigation.
    }
  }

  private cancel(): void {
    this.canceled.emit();
  }

  private resolvePendingDecision(value: boolean): void {
    const resolve = this.pendingDecisionResolver;
    this.pendingDecisionResolver = undefined;
    this.showPendingChangesDialog.set(false);
    resolve?.(value);
  }
}

function formOptions(
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

function optionId(value: string, options: readonly { id: string }[]): string | null {
  return options.some(({ id }) => id === value) ? value : null;
}

function configurationOptions(
  options: readonly ItemConfigurationOption[],
): readonly FormFieldOption[] {
  return options.map(({ id, name }) => ({ value: id, label: name }));
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

function primaryPath(resource: UniverseResourceDetail): string | null {
  return resource.type === 'npc' || resource.type === 'player-character'
    ? resource.portraitPath
    : resource.imagePath;
}
