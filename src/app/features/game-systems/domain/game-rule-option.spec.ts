import { createUniverseRuleOption } from '@app/features/game-systems/domain/game-rule-option';

describe('GameRuleOption', () => {
  it.each([
    ['race', 'Elfe'],
    ['class', 'Rôdeuse'],
  ] as const)('creates a universe-scoped %s option', (category, label) => {
    expect(
      createUniverseRuleOption(
        'dnd5e',
        'forgotten-realms',
        category,
        label,
        null,
        () => 'option-id',
        () => new Date('2026-10-09T18:00:00.000Z'),
      ),
    ).toEqual({
      id: 'option-id',
      gameSystemId: 'dnd5e',
      universeId: 'forgotten-realms',
      category,
      parentOptionId: null,
      code: label === 'Elfe' ? 'elfe' : 'rodeuse',
      label,
      createdAt: '2026-10-09T18:00:00.000Z',
      updatedAt: '2026-10-09T18:00:00.000Z',
    });
  });

  it('creates a character subspecies attached to its parent species', () => {
    expect(
      createUniverseRuleOption(
        'dnd5e',
        'forgotten-realms',
        'subrace',
        'Drow',
        'elf-id',
        () => 'drow-id',
        () => new Date('2026-10-09T18:00:00.000Z'),
      ),
    ).toMatchObject({
      id: 'drow-id',
      category: 'subrace',
      parentOptionId: 'elf-id',
      code: 'drow',
      label: 'Drow',
    });
  });

  it('rejects a character subspecies without a parent species', () => {
    expect(() =>
      createUniverseRuleOption('dnd5e', 'forgotten-realms', 'subrace', 'Drow'),
    ).toThrow('Une sous-espèce doit être rattachée');
  });
});
