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
});
