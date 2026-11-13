import { FormControl, FormGroup, Validators } from '@angular/forms';

import type { CharacterRuleCatalog } from '@app/features/game-systems/domain/character-rule-catalog';
import {
  optionIdFor,
  optionLabel,
  type CreatureRuleCatalog,
} from '@app/features/game-systems/domain/creature-rule-catalog';
import type {
  UniverseMonsterDetail,
  UniverseNarrativeItemDetail,
  UniverseNpcDetail,
  UniversePlayerCharacterDetail,
} from '@app/features/game-systems/domain/universe-resource';
import type { ItemConfigurationOption } from '@app/features/items/domain/item-configuration';
import type { NpcSheet } from '@app/features/npcs/domain/npc';
import type { PlayerCharacterSheet } from '@app/features/players/domain/player-character';
import type { RichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import type { FormFieldOption } from '@app/shared/ui/form-field/form-field';
import { knownOptionId } from '@app/shared/ui/form-field/rule-form-options';
import type { CreatureFeatureDrafts } from '@app/shared/ui/rich-text-feature-editor/creature-feature-sections';

export type EditorCatalogs = Readonly<{
  creature: CreatureRuleCatalog;
  character: CharacterRuleCatalog;
}>;

const text = () => new FormControl('', { nonNullable: true });
const tags = () => new FormControl<readonly string[]>([], { nonNullable: true });
const positive = () => new FormControl<number | null>(null, [Validators.min(0)]);
const requiredName = () =>
  new FormControl('', { nonNullable: true, validators: [Validators.required] });

export function createCreatureForm() {
  return new FormGroup({
    name: requiredName(),
    size: text(),
    creatureType: text(),
    creatureSubspecies: text(),
    race: text(),
    subrace: text(),
    className: text(),
    occupation: text(),
    alignment: text(),
    armorClass: positive(),
    armorClassDetails: text(),
    hitPoints: positive(),
    hitPointFormula: text(),
    speed: text(),
    strength: positive(),
    dexterity: positive(),
    constitution: positive(),
    intelligence: positive(),
    wisdom: positive(),
    charisma: positive(),
    savingThrows: tags(),
    skills: tags(),
    damageVulnerabilities: tags(),
    damageResistances: tags(),
    damageImmunities: tags(),
    conditionImmunities: tags(),
    senses: tags(),
    languages: tags(),
    challengeRating: text(),
    experiencePoints: positive(),
  });
}

export function createPlayerForm() {
  return new FormGroup({
    name: requiredName(),
    maxHitPoints: positive(),
    race: text(),
    subrace: text(),
    className: text(),
    level: new FormControl<number | null>(null, [Validators.min(1), Validators.max(20)]),
    armorClass: positive(),
    speed: positive(),
    passivePerception: positive(),
    passiveInsight: positive(),
    passiveInvestigation: positive(),
    senses: tags(),
    languages: tags(),
    conditions: tags(),
    exhaustionLevel: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(6)],
    }),
  });
}

export function createLocationForm() {
  return new FormGroup({
    name: requiredName(),
    parentLocationId: new FormControl<string | null>(null),
    summary: text(),
  });
}

export function createItemForm() {
  return new FormGroup({
    name: requiredName(),
    itemTypeId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    itemRarityId: new FormControl<string | null>(null),
    attunement: new FormControl<UniverseNarrativeItemDetail['attunement']>('none', {
      nonNullable: true,
    }),
    attunementCondition: text(),
    summary: text(),
  });
}

export type CreatureFormValue = ReturnType<ReturnType<typeof createCreatureForm>['getRawValue']>;
export type PlayerFormValue = ReturnType<ReturnType<typeof createPlayerForm>['getRawValue']>;

/** Valeurs du formulaire PNJ ou monstre ; les libellés connus deviennent des options. */
export function creatureFormValue(
  detail: UniverseNpcDetail | UniverseMonsterDetail,
  catalogs: EditorCatalogs,
): CreatureFormValue {
  const { sheet } = detail;
  const { creature, character } = catalogs;
  return {
    name: detail.name,
    size: optionIdFor(sheet.sizeOptionId, sheet.size, creature.sizes),
    creatureType: optionIdFor(
      sheet.creatureTypeOptionId,
      sheet.creatureType,
      creature.creatureTypes,
    ),
    creatureSubspecies: optionIdFor(
      sheet.creatureSubspeciesOptionId,
      sheet.creatureSubspecies,
      creature.subspecies,
    ),
    race: optionIdFor(sheet.raceOptionId, sheet.race, character.races) || sheet.race,
    subrace: optionIdFor(sheet.subraceOptionId, sheet.subrace, character.subraces) || sheet.subrace,
    className:
      optionIdFor(sheet.classOptionId, sheet.className, character.classes) || sheet.className,
    occupation: sheet.occupation,
    alignment: optionIdFor(sheet.alignmentOptionId, sheet.alignment, creature.alignments),
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
  };
}

export type CreatureSheetDrafts = Readonly<{
  officialDescription: RichTextDocument;
  features: CreatureFeatureDrafts;
}>;

/**
 * Reconstruit la fiche d’un PNJ ou d’un monstre. Un PNJ édite son identité de personnage
 * (espèce, classe, occupation) ; un monstre édite son type et sa sous-espèce de créature.
 */
export function buildCreatureSheet(
  value: CreatureFormValue,
  previous: NpcSheet,
  isNpc: boolean,
  catalogs: EditorCatalogs,
  drafts: CreatureSheetDrafts,
): NpcSheet {
  const { creature, character } = catalogs;
  return {
    ...previous,
    sizeOptionId: value.size || null,
    size: optionLabel(value.size, creature.sizes, previous.size),
    creatureTypeOptionId: isNpc ? previous.creatureTypeOptionId : value.creatureType || null,
    creatureType: optionLabel(
      isNpc ? '' : value.creatureType,
      creature.creatureTypes,
      previous.creatureType,
    ),
    creatureSubspeciesOptionId: isNpc
      ? previous.creatureSubspeciesOptionId
      : value.creatureSubspecies || null,
    creatureSubspecies: isNpc
      ? previous.creatureSubspecies
      : optionLabel(value.creatureSubspecies, creature.subspecies, ''),
    raceOptionId: isNpc ? knownOptionId(value.race, character.races) : previous.raceOptionId,
    race: isNpc ? optionLabel(value.race, character.races, value.race) : previous.race,
    subraceOptionId: isNpc
      ? knownOptionId(value.subrace, character.subraces)
      : previous.subraceOptionId,
    subrace: isNpc
      ? optionLabel(value.subrace, character.subraces, value.subrace)
      : previous.subrace,
    classOptionId: isNpc
      ? knownOptionId(value.className, character.classes)
      : previous.classOptionId,
    className: isNpc
      ? optionLabel(value.className, character.classes, value.className)
      : previous.className,
    occupation: isNpc ? value.occupation : previous.occupation,
    alignmentOptionId: value.alignment || null,
    alignment: optionLabel(value.alignment, creature.alignments, previous.alignment),
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
  };
}

/** Valeurs du formulaire PJ ; les libellés connus deviennent des options. */
export function playerFormValue(
  detail: UniversePlayerCharacterDetail,
  character: CharacterRuleCatalog,
): PlayerFormValue {
  const { sheet } = detail;
  return {
    name: detail.name,
    maxHitPoints: detail.maxHitPoints,
    race: optionIdFor(sheet.raceOptionId, sheet.race, character.races) || sheet.race,
    subrace: optionIdFor(sheet.subraceOptionId, sheet.subrace, character.subraces) || sheet.subrace,
    className:
      optionIdFor(sheet.classOptionId, sheet.className, character.classes) || sheet.className,
    level: sheet.level,
    armorClass: sheet.armorClass,
    speed: sheet.speed,
    passivePerception: sheet.passivePerception,
    passiveInsight: sheet.passiveInsight,
    passiveInvestigation: sheet.passiveInvestigation,
    senses: sheet.senses,
    languages: sheet.languages,
    conditions: sheet.conditions,
    exhaustionLevel: sheet.exhaustionLevel,
  };
}

/** Reconstruit la fiche canonique d’un PJ ; les notes privées restent propres aux campagnes. */
export function buildPlayerSheet(
  value: PlayerFormValue,
  character: CharacterRuleCatalog,
): PlayerCharacterSheet {
  return {
    raceOptionId: knownOptionId(value.race, character.races),
    race: optionLabel(value.race, character.races, value.race),
    subraceOptionId: knownOptionId(value.subrace, character.subraces),
    subrace: optionLabel(value.subrace, character.subraces, value.subrace),
    classOptionId: knownOptionId(value.className, character.classes),
    className: optionLabel(value.className, character.classes, value.className),
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
}

export function configurationOptions(
  options: readonly ItemConfigurationOption[],
): readonly FormFieldOption[] {
  return options.map(({ id, name }) => ({ value: id, label: name }));
}
