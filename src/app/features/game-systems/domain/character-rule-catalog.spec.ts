import {
  subracesForRace,
  type CharacterRuleCatalog,
} from '@app/features/game-systems/domain/character-rule-catalog';
import type { GameRuleOption } from '@app/features/game-systems/domain/game-rule-option';

const option: GameRuleOption = {
  id: 'elf',
  gameSystemId: 'dnd5e',
  universeId: 'dnd5e:generic',
  category: 'race',
  parentOptionId: null,
  code: 'elfe',
  label: 'Elfe',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('CharacterRuleCatalog', () => {
  it('only exposes subspecies attached to the selected species', () => {
    const catalog: CharacterRuleCatalog = {
      races: [option, { ...option, id: 'dwarf', code: 'nain', label: 'Nain' }],
      subraces: [
        {
          ...option,
          id: 'drow',
          category: 'subrace',
          parentOptionId: 'elf',
          code: 'drow',
          label: 'Drow',
        },
        {
          ...option,
          id: 'duergar',
          category: 'subrace',
          parentOptionId: 'dwarf',
          code: 'duergar',
          label: 'Duergar',
        },
      ],
      classes: [],
    };

    expect(subracesForRace(catalog, 'elf').map(({ id }) => id)).toEqual(['drow']);
  });
});
