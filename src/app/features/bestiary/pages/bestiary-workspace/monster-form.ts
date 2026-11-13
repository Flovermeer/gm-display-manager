import { FormControl, FormGroup, Validators } from '@angular/forms';

import {
  createEmptyMonsterSheet,
  type Monster,
  type MonsterSheet,
} from '@app/features/bestiary/domain/monster';
import {
  optionIdFor,
  optionLabel,
  type CreatureRuleCatalog,
} from '@app/features/game-systems/domain/creature-rule-catalog';
import type { RichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import type { CreatureFeatureDrafts } from '@app/shared/ui/rich-text-feature-editor/creature-feature-sections';

export type MonsterForm = ReturnType<typeof createMonsterForm>;
export type MonsterFormValue = ReturnType<MonsterForm['getRawValue']>;

export function createMonsterForm() {
  const score = () => new FormControl<number | null>(null, [Validators.min(0)]);
  const text = () => new FormControl('', { nonNullable: true });
  const tags = () => new FormControl<readonly string[]>([], { nonNullable: true });

  return new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    size: text(),
    creatureType: text(),
    creatureSubspecies: text(),
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

/** Valeurs du formulaire ; les libellés connus deviennent des options du référentiel. */
export function monsterToFormValue(
  monster: Monster | null,
  catalog: CreatureRuleCatalog,
): MonsterFormValue {
  const sheet = monster?.sheet ?? createEmptyMonsterSheet();
  return {
    name: monster?.name ?? '',
    size: optionIdFor(sheet.sizeOptionId, sheet.size, catalog.sizes),
    creatureType: optionIdFor(
      sheet.creatureTypeOptionId,
      sheet.creatureType,
      catalog.creatureTypes,
    ),
    creatureSubspecies: optionIdFor(
      sheet.creatureSubspeciesOptionId,
      sheet.creatureSubspecies,
      catalog.subspecies,
    ),
    alignment: optionIdFor(sheet.alignmentOptionId, sheet.alignment, catalog.alignments),
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
            const id = optionIdFor(null, label, catalog.languages);
            return id ? [id] : [];
          }),
    challengeRating: sheet.challengeRating,
    experiencePoints: sheet.experiencePoints,
  };
}

export type MonsterFormDrafts = Readonly<{
  previousSheet: MonsterSheet;
  officialDescription: RichTextDocument;
  features: CreatureFeatureDrafts;
}>;

/** Convertit le formulaire en fiche en conservant les champs non édités et les libellés hérités. */
export function monsterFormValueToSheet(
  value: MonsterFormValue,
  catalog: CreatureRuleCatalog,
  drafts: MonsterFormDrafts,
): MonsterSheet {
  const previous = drafts.previousSheet;
  return {
    ...previous,
    sizeOptionId: value.size || null,
    size: optionLabel(value.size, catalog.sizes, previous.size),
    creatureTypeOptionId: value.creatureType || null,
    creatureType: optionLabel(value.creatureType, catalog.creatureTypes, previous.creatureType),
    creatureSubspeciesOptionId: value.creatureSubspecies || null,
    creatureSubspecies: optionLabel(value.creatureSubspecies, catalog.subspecies, ''),
    alignmentOptionId: value.alignment || null,
    alignment: optionLabel(value.alignment, catalog.alignments, previous.alignment),
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
    languages: value.languages.map((id) => optionLabel(id, catalog.languages, id)),
    challengeRating: value.challengeRating,
    experiencePoints: value.experiencePoints,
    officialDescription: drafts.officialDescription,
    ...drafts.features,
  };
}
