import { EMPTY_CHARACTER_RULE_CATALOG } from '@app/features/game-systems/domain/character-rule-catalog';
import { EMPTY_CREATURE_RULE_CATALOG } from '@app/features/game-systems/domain/creature-rule-catalog';
import type { GameRuleOption } from '@app/features/game-systems/domain/game-rule-option';
import { createEmptyNpcSheet, createNpc } from '@app/features/npcs/domain/npc';
import {
  createNpcForm,
  emptyNpcFormValue,
  npcFormValueToInput,
  npcToFormValue,
  type NpcFormCatalogs,
} from '@app/features/npcs/pages/npc-workspace/npc-form';
import { createEmptyRichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
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

describe('NPC form', () => {
  const catalogs: NpcFormCatalogs = {
    creature: {
      ...EMPTY_CREATURE_RULE_CATALOG,
      languages: [option('common', 'language', 'Commun')],
    },
    character: { ...EMPTY_CHARACTER_RULE_CATALOG, races: [option('elf', 'race', 'Elfe')] },
  };
  const npc = createNpc({
    campaignId: 'campaign-id',
    name: 'Mira Vell',
    summary: 'Aubergiste',
    sheet: {
      ...createEmptyNpcSheet(),
      race: 'Elfe',
      className: 'Barde',
      languages: ['Commun'],
      armorClass: 12,
    },
  });

  it('rejects negative or decimal numbers', () => {
    const form = createNpcForm();

    form.controls.armorClass.setValue(-1);
    expect(form.controls.armorClass.valid).toBe(false);
    form.controls.armorClass.setValue(12.5);
    expect(form.controls.armorClass.hasError('integer')).toBe(true);
    form.controls.armorClass.setValue(12);
    expect(form.controls.armorClass.valid).toBe(true);
  });

  it('maps known legacy labels to catalog options and keeps unknown labels', () => {
    const value = npcToFormValue(npc, catalogs);

    expect(value.race).toBe('elf');
    expect(value.className).toBe('Barde');
    expect(value.languages).toEqual(['common']);
    expect(value.armorClass).toBe(12);
  });

  it('builds the NPC input with catalog labels and the drafts of the screen', () => {
    const officialDescription = createEmptyRichTextDocument();
    const input = npcFormValueToInput(
      { ...npcToFormValue(npc, catalogs), name: 'Mira la Rousse' },
      catalogs,
      {
        previousSheet: npc.sheet,
        officialDescription,
        features: emptyCreatureFeatureDrafts(),
      },
    );

    expect(input.name).toBe('Mira la Rousse');
    expect(input.sheet.raceOptionId).toBe('elf');
    expect(input.sheet.race).toBe('Elfe');
    expect(input.sheet.classOptionId).toBeNull();
    expect(input.sheet.className).toBe('Barde');
    expect(input.sheet.languages).toEqual(['Commun']);
    expect(input.sheet.officialDescription).toBe(officialDescription);
  });

  it('starts a new NPC as active with an empty sheet', () => {
    expect(emptyNpcFormValue()).toMatchObject({ name: '', status: 'active', languages: [] });
  });
});
