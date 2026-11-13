import { Component, computed, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { subracesForRace } from '@app/features/game-systems/domain/character-rule-catalog';
import {
  NPC_KINDS,
  NPC_STATUSES,
  npcKindLabel,
  npcStatusLabel,
  type NpcSheet,
} from '@app/features/npcs/domain/npc';
import type { NpcForm, NpcFormCatalogs } from '@app/features/npcs/pages/npc-workspace/npc-form';
import { ruleFormOptions } from '@app/shared/ui/form-field/rule-form-options';
import type { ResourceMentionCandidate } from '@app/shared/rich-text-editor/resource-mention';
import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';
import type { RichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { FormField, type FormFieldOption } from '@app/shared/ui/form-field/form-field';
import { MultiSelectField } from '@app/shared/ui/multi-select-field/multi-select-field';
import {
  CREATURE_FEATURE_SECTIONS,
  type CreatureFeatureDrafts,
  type CreatureFeatureSection,
} from '@app/shared/ui/rich-text-feature-editor/creature-feature-sections';
import { RichTextFeatureEditor } from '@app/shared/ui/rich-text-feature-editor/rich-text-feature-editor';
import { TagInput } from '@app/shared/ui/tag-input/tag-input';

type NpcTagField =
  | 'savingThrows'
  | 'skills'
  | 'damageVulnerabilities'
  | 'damageResistances'
  | 'damageImmunities'
  | 'conditionImmunities'
  | 'senses'
  | 'languages';

export type NpcFeatureSectionChange = Readonly<{
  section: CreatureFeatureSection;
  features: CreatureFeatureDrafts[CreatureFeatureSection];
}>;

/** Formulaire d’édition d’une fiche PNJ ; la page reste maîtresse du formulaire et des brouillons. */
@Component({
  selector: 'app-npc-sheet-form',
  imports: [
    ReactiveFormsModule,
    ButtonDirective,
    FormField,
    MultiSelectField,
    RichTextEditor,
    RichTextFeatureEditor,
    TagInput,
  ],
  templateUrl: './npc-sheet-form.html',
  styleUrl: './npc-sheet-form.scss',
})
export class NpcSheetForm {
  readonly form = input.required<NpcForm>();
  readonly catalogs = input.required<NpcFormCatalogs>();
  /** Fiche d’origine, pour garder sélectionnables les anciennes valeurs libres. */
  readonly referenceSheet = input<NpcSheet | null>(null);
  readonly featureDrafts = input.required<CreatureFeatureDrafts>();
  readonly officialDescription = input.required<RichTextDocument>();
  readonly mentionCandidates = input<readonly ResourceMentionCandidate[]>([]);
  readonly hasIdleVideo = input(false);
  readonly isImportingVideo = input(false);

  readonly submitted = output();
  readonly featuresChange = output<NpcFeatureSectionChange>();
  readonly officialDescriptionChange = output<RichTextDocument>();
  readonly mentionActivate = output<ResourceMentionCandidate>();
  readonly idleVideoRequested = output();

  protected readonly featureSections = CREATURE_FEATURE_SECTIONS;
  protected readonly kindFieldOptions: readonly FormFieldOption[] = NPC_KINDS.map((kind) => ({
    value: kind,
    label: npcKindLabel(kind),
  }));
  protected readonly statusFieldOptions: readonly FormFieldOption[] = NPC_STATUSES.map(
    (status) => ({ value: status, label: npcStatusLabel(status) }),
  );
  protected readonly sizeOptions = computed(() => ruleFormOptions(this.catalogs().creature.sizes));
  protected readonly raceOptions = computed(() =>
    ruleFormOptions(this.catalogs().character.races, this.referenceSheet()?.race),
  );
  protected readonly classOptions = computed(() =>
    ruleFormOptions(this.catalogs().character.classes, this.referenceSheet()?.className),
  );
  protected readonly alignmentOptions = computed(() =>
    ruleFormOptions(this.catalogs().creature.alignments),
  );
  protected readonly languageOptions = computed(() =>
    ruleFormOptions(this.catalogs().creature.languages),
  );

  /** La fiche technique reste en base mais n’est pas éditée pour une organisation. */
  protected isOrganization(): boolean {
    return this.form().controls.kind.value === 'organization';
  }

  protected subraceOptions(): readonly FormFieldOption[] {
    return ruleFormOptions(
      subracesForRace(this.catalogs().character, this.form().controls.race.value),
      this.referenceSheet()?.subrace,
    );
  }

  /** Une sous-espèce qui n’appartient plus à l’espèce choisie est effacée. */
  protected raceChanged(): void {
    const controls = this.form().controls;
    const current = controls.subrace.value;
    const available = subracesForRace(this.catalogs().character, controls.race.value);
    if (current && !available.some(({ id }) => id === current)) {
      controls.subrace.setValue('');
    }
  }

  protected updateTags(field: NpcTagField, value: readonly string[]): void {
    const control = this.form().controls[field];
    control.setValue(value);
    control.markAsDirty();
  }

  protected updateLanguages(values: readonly string[]): void {
    this.updateTags('languages', values);
  }

  protected hasInvalidSheetNumbers(): boolean {
    const controls = this.form().controls;
    return [
      controls.armorClass,
      controls.hitPoints,
      controls.strength,
      controls.dexterity,
      controls.constitution,
      controls.intelligence,
      controls.wisdom,
      controls.charisma,
      controls.experiencePoints,
    ].some((control) => control.invalid && (control.dirty || control.touched));
  }
}
