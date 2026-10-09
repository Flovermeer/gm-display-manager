import {
  EMPTY_PLAYER_CHARACTER_SHEET,
  PLAYER_CHARACTER_SHEET_SCHEMA_VERSION,
  createPlayerCharacter,
  updatePlayerCharacter,
  updatePlayerCharacterHitPoints,
  type PlayerCharacterFactoryDependencies,
} from '@app/features/players/domain/player-character';

describe('PlayerCharacter', () => {
  const dependencies: PlayerCharacterFactoryDependencies = {
    createId: () => 'character-id',
    now: () => new Date('2026-08-12T18:30:00.000Z'),
  };

  it('creates a normalized player character sheet', () => {
    const character = createPlayerCharacter(
      'campaign-id',
      {
        name: '  Nyssa  ',
        playerName: '  Flore  ',
        status: 'active',
        currentHitPoints: 18,
        maxHitPoints: 24,
        sheet: {
          ...EMPTY_PLAYER_CHARACTER_SHEET,
          className: '  Rôdeuse  ',
          level: 3,
          languages: [' Commun ', 'commun', ' Elfique '],
          privateNotes: '  Porte la clé.  ',
        },
      },
      dependencies,
    );

    expect(character).toMatchObject({
      id: 'character-id',
      campaignId: 'campaign-id',
      name: 'Nyssa',
      playerName: 'Flore',
      currentHitPoints: 18,
      maxHitPoints: 24,
      sheet: {
        className: 'Rôdeuse',
        level: 3,
        languages: ['Commun', 'Elfique'],
        privateNotes: 'Porte la clé.',
      },
      sheetSchemaVersion: PLAYER_CHARACTER_SHEET_SCHEMA_VERSION,
    });
  });

  it('updates persistent hit points without changing the reference sheet', () => {
    const character = createPlayerCharacter(
      'campaign-id',
      {
        name: 'Nyssa',
        playerName: '',
        status: 'active',
        currentHitPoints: 18,
        maxHitPoints: 24,
        sheet: EMPTY_PLAYER_CHARACTER_SHEET,
      },
      dependencies,
    );

    expect(
      updatePlayerCharacterHitPoints(character, 9, () => new Date('2026-08-13T10:00:00.000Z')),
    ).toMatchObject({
      currentHitPoints: 9,
      maxHitPoints: 24,
      sheet: EMPTY_PLAYER_CHARACTER_SHEET,
      updatedAt: '2026-08-13T10:00:00.000Z',
    });
  });

  it('rejects hit points above the maximum', () => {
    const character = createPlayerCharacter(
      'campaign-id',
      {
        name: 'Nyssa',
        playerName: '',
        status: 'active',
        currentHitPoints: 18,
        maxHitPoints: 24,
        sheet: EMPTY_PLAYER_CHARACTER_SHEET,
      },
      dependencies,
    );

    expect(() => updatePlayerCharacterHitPoints(character, 25)).toThrow(
      'Current hit points cannot exceed maximum hit points.',
    );
    expect(() => updatePlayerCharacter(character, { ...character, currentHitPoints: 25 })).toThrow(
      'Current hit points cannot exceed maximum hit points.',
    );
  });
});
