import { createEmptyMonsterSheet, createMonster } from '@app/features/bestiary/domain/monster';
import {
  createMonsterForm,
  monsterFormValueToSheet,
  monsterToFormValue,
} from '@app/features/bestiary/pages/bestiary-workspace/monster-form';
import { EMPTY_CREATURE_RULE_CATALOG } from '@app/features/game-systems/domain/creature-rule-catalog';
import type { GameRuleOption } from '@app/features/game-systems/domain/game-rule-option';
import { emptyCreatureFeatureDrafts } from '@app/shared/ui/rich-text-feature-editor/creature-feature-sections';

const undead: GameRuleOption = {
  id: 'undead',
  gameSystemId: 'dnd5e',
  universeId: null,
  category: 'creature_type',
  parentOptionId: null,
  code: 'undead',
  label: 'Mort-vivant',
  createdAt: '2026-11-13T00:00:00.000Z',
  updatedAt: '2026-11-13T00:00:00.000Z',
};

describe('monster form', () => {
  const catalog = { ...EMPTY_CREATURE_RULE_CATALOG, creatureTypes: [undead] };
  const atropal = createMonster('campaign-id', {
    name: 'Atropal',
    sheet: { ...createEmptyMonsterSheet(), creatureType: 'Mort-vivant', hitPoints: 225 },
  });

  it('maps a legacy creature type label to its catalog option', () => {
    const value = monsterToFormValue(atropal, catalog);

    expect(value.name).toBe('Atropal');
    expect(value.creatureType).toBe('undead');
    expect(value.hitPoints).toBe(225);
  });

  it('round-trips the sheet with catalog labels and edited values', () => {
    const form = createMonsterForm();
    form.reset(monsterToFormValue(atropal, catalog));
    form.controls.hitPoints.setValue(250);

    const sheet = monsterFormValueToSheet(form.getRawValue(), catalog, {
      previousSheet: atropal.sheet,
      officialDescription: atropal.sheet.officialDescription,
      features: emptyCreatureFeatureDrafts(),
    });

    expect(sheet.creatureTypeOptionId).toBe('undead');
    expect(sheet.creatureType).toBe('Mort-vivant');
    expect(sheet.hitPoints).toBe(250);
  });

  it('rejects negative hit points', () => {
    const form = createMonsterForm();
    form.controls.hitPoints.setValue(-1);

    expect(form.controls.hitPoints.valid).toBe(false);
  });
});
