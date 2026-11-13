import { EMPTY_CHARACTER_RULE_CATALOG } from '@app/features/game-systems/domain/character-rule-catalog';
import { EMPTY_CREATURE_RULE_CATALOG } from '@app/features/game-systems/domain/creature-rule-catalog';
import type { GameRuleOption } from '@app/features/game-systems/domain/game-rule-option';
import type { UniverseNpcDetail } from '@app/features/game-systems/domain/universe-resource';
import {
  buildCreatureSheet,
  createCreatureForm,
  creatureFormValue,
  type EditorCatalogs,
} from '@app/features/game-systems/ui/universe-resource-editor/universe-resource-forms';
import { createEmptyNpcSheet } from '@app/features/npcs/domain/npc';
import { emptyCreatureFeatureDrafts } from '@app/shared/ui/rich-text-feature-editor/creature-feature-sections';

function option(id: string, category: GameRuleOption['category'], label: string): GameRuleOption {
  return {
    id,
    gameSystemId: 'dnd5e',
    universeId: 'forgotten-realms',
    category,
    parentOptionId: null,
    code: id,
    label,
    createdAt: '2026-11-13T00:00:00.000Z',
    updatedAt: '2026-11-13T00:00:00.000Z',
  };
}

describe('universe resource forms', () => {
  const catalogs: EditorCatalogs = {
    creature: {
      ...EMPTY_CREATURE_RULE_CATALOG,
      creatureTypes: [option('undead', 'creature_type', 'Mort-vivant')],
    },
    character: { ...EMPTY_CHARACTER_RULE_CATALOG, races: [option('elf', 'race', 'Elfe')] },
  };
  const npc: UniverseNpcDetail = {
    id: 'mira',
    universeId: 'forgotten-realms',
    type: 'npc',
    name: 'Mira Vell',
    deletedAt: null,
    createdAt: '2026-11-13T00:00:00.000Z',
    updatedAt: '2026-11-13T00:00:00.000Z',
    portraitPath: null,
    idleVideoPath: null,
    sheet: { ...createEmptyNpcSheet(), race: 'Elfe', creatureType: 'Humanoïde' },
  };

  it('edits the character identity of an NPC and keeps its creature type', () => {
    const form = createCreatureForm();
    form.reset(creatureFormValue(npc, catalogs));
    expect(form.controls.race.value).toBe('elf');

    form.controls.creatureType.setValue('undead');
    const sheet = buildCreatureSheet(form.getRawValue(), npc.sheet, true, catalogs, {
      officialDescription: npc.sheet.officialDescription,
      features: emptyCreatureFeatureDrafts(),
    });

    expect(sheet.raceOptionId).toBe('elf');
    expect(sheet.race).toBe('Elfe');
    expect(sheet.creatureType).toBe('Humanoïde');
  });

  it('edits the creature type of a monster and keeps its character identity', () => {
    const form = createCreatureForm();
    form.reset(creatureFormValue(npc, catalogs));
    form.controls.creatureType.setValue('undead');

    const sheet = buildCreatureSheet(form.getRawValue(), npc.sheet, false, catalogs, {
      officialDescription: npc.sheet.officialDescription,
      features: emptyCreatureFeatureDrafts(),
    });

    expect(sheet.creatureTypeOptionId).toBe('undead');
    expect(sheet.creatureType).toBe('Mort-vivant');
    expect(sheet.race).toBe('Elfe');
    expect(sheet.raceOptionId).toBeNull();
  });
});
