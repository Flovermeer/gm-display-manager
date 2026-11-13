import {
  type AbstractControl,
  FormControl,
  FormGroup,
  type ValidationErrors,
  Validators,
} from '@angular/forms';

import type { CharacterRuleCatalog } from '@app/features/game-systems/domain/character-rule-catalog';
import {
  optionIdFor,
  optionLabel,
  type CreatureRuleCatalog,
} from '@app/features/game-systems/domain/creature-rule-catalog';
import {
  createEmptyNpcSheet,
  type Npc,
  type NpcSheet,
  type NpcStatus,
  type UpdateNpcInput,
} from '@app/features/npcs/domain/npc';
import type { RichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import type { FormFieldOption } from '@app/shared/ui/form-field/form-field';
import type { CreatureFeatureDrafts } from '@app/shared/ui/rich-text-feature-editor/creature-feature-sections';

export type NpcFormCatalogs = Readonly<{
  creature: CreatureRuleCatalog;
  character: CharacterRuleCatalog;
}>;

export type NpcForm = ReturnType<typeof createNpcForm>;
export type NpcFormValue = ReturnType<NpcForm['getRawValue']>;

export function createNpcForm() {
  const score = () => new FormControl<number | null>(null, [Validators.min(0), integerValidator]);
  const text = () => new FormControl('', { nonNullable: true });
  const tags = () => new FormControl<readonly string[]>([], { nonNullable: true });

  return new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    status: new FormControl<NpcStatus>('active', { nonNullable: true }),
    summary: text(),
    notes: text(),
    size: text(),
    race: text(),
    subrace: text(),
    className: text(),
    occupation: text(),
    alignment: text(),
    armorClass: score(),
    armorClassDetails: text(),
    hitPoints: score(),
    hitPointFormula: text(),
    speed: text(),
    strength: score(),
    dexterity: score(),
    constitution: score(),
    intelligence: score(),
    wisdom: score(),
    charisma: score(),
    savingThrows: tags(),
    skills: tags(),
    damageVulnerabilities: tags(),
    damageResistances: tags(),
    damageImmunities: tags(),
    conditionImmunities: tags(),
    senses: tags(),
    languages: tags(),
    challengeRating: text(),
    experiencePoints: score(),
  });
}

/** Valeurs d’une nouvelle fiche, sans résolution des référentiels. */
export function emptyNpcFormValue(): NpcFormValue {
  const sheet = createEmptyNpcSheet();
  return {
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
    ...sheetNumbersAndTags(sheet),
    languages: sheet.languageOptionIds,
  };
}

/** Valeurs du formulaire d’une fiche existante ; les libellés connus deviennent des options. */
export function npcToFormValue(npc: Npc, catalogs: NpcFormCatalogs): NpcFormValue {
  const { sheet } = npc;
  const { creature, character } = catalogs;
  return {
    name: npc.name,
    status: npc.status,
    summary: npc.summary,
    notes: '',
    size: optionIdFor(sheet.sizeOptionId, sheet.size, creature.sizes),
    race: optionIdFor(sheet.raceOptionId, sheet.race, character.races) || sheet.race,
    subrace: optionIdFor(sheet.subraceOptionId, sheet.subrace, character.subraces) || sheet.subrace,
    className:
      optionIdFor(sheet.classOptionId, sheet.className, character.classes) || sheet.className,
    occupation: sheet.occupation,
    alignment: optionIdFor(sheet.alignmentOptionId, sheet.alignment, creature.alignments),
    ...sheetNumbersAndTags(sheet),
    languages:
      sheet.languageOptionIds.length > 0
        ? sheet.languageOptionIds
        : sheet.languages.flatMap((label) => {
            const id = optionIdFor(null, label, creature.languages);
            return id ? [id] : [];
          }),
  };
}

export type NpcFormDrafts = Readonly<{
  previousSheet: NpcSheet;
  officialDescription: RichTextDocument;
  features: CreatureFeatureDrafts;
}>;

/** Convertit le formulaire en saisie métier en conservant les champs non édités de la fiche. */
export function npcFormValueToInput(
  value: NpcFormValue,
  catalogs: NpcFormCatalogs,
  drafts: NpcFormDrafts,
): UpdateNpcInput {
  const { creature, character } = catalogs;
  const previous = drafts.previousSheet;
  return {
    name: value.name,
    status: value.status,
    summary: value.summary,
    notes: '',
    sheet: {
      sizeOptionId: value.size || null,
      size: optionLabel(value.size, creature.sizes),
      creatureTypeOptionId: previous.creatureTypeOptionId,
      creatureType: previous.creatureType,
      creatureSubspeciesOptionId: previous.creatureSubspeciesOptionId,
      creatureSubspecies: previous.creatureSubspecies,
      raceOptionId: knownOptionId(value.race, character.races),
      race: optionLabel(value.race, character.races, value.race),
      subraceOptionId: knownOptionId(value.subrace, character.subraces),
      subrace: optionLabel(value.subrace, character.subraces, value.subrace),
      classOptionId: knownOptionId(value.className, character.classes),
      className: optionLabel(value.className, character.classes, value.className),
      occupation: value.occupation,
      alignmentOptionId: value.alignment || null,
      alignment: optionLabel(value.alignment, creature.alignments),
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
      languages: value.languages.map((id) => optionLabel(id, creature.languages, id)),
      challengeRating: value.challengeRating,
      experiencePoints: value.experiencePoints,
      officialDescription: drafts.officialDescription,
      ...drafts.features,
    },
  };
}

function sheetNumbersAndTags(sheet: NpcSheet) {
  return {
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
    challengeRating: sheet.challengeRating,
    experiencePoints: sheet.experiencePoints,
  };
}

function knownOptionId(value: string, options: readonly { id: string }[]): string | null {
  return options.some(({ id }) => id === value) ? value : null;
}

function integerValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === null || Number.isInteger(control.value) ? null : { integer: true };
}

/** Options d’un référentiel ; une ancienne valeur libre absente du référentiel reste sélectionnable. */
export function ruleFormOptions(
  options: readonly Readonly<{ id: string; label: string; code: string }>[],
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
