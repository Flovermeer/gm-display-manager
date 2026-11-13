import {
  createEmptyMonsterSheet,
  createMonster,
  monsterTypeLine,
  MONSTER_SHEET_SCHEMA_VERSION,
  updateMonster,
} from '@app/features/bestiary/domain/monster';

describe('Monster', () => {
  const now = () => new Date('2026-08-14T12:00:00.000Z');

  it('creates a normalized canonical sheet selected by a campaign', () => {
    const monster = createMonster(
      'campaign-id',
      {
        name: '  Atropal  ',
        imagePath: 'universes/forgotten-realms/media/monsters/atropal.webp',
        sheet: { ...createEmptyMonsterSheet(), creatureType: ' Mort-vivant ', hitPoints: 225 },
      },
      () => 'monster-id',
      now,
    );

    expect(monster).toMatchObject({
      id: 'monster-id',
      campaignId: 'campaign-id',
      name: 'Atropal',
      sheet: { creatureType: 'Mort-vivant', hitPoints: 225 },
      sheetSchemaVersion: MONSTER_SHEET_SCHEMA_VERSION,
    });
  });

  it('updates the canonical sheet without changing its selection context', () => {
    const monster = createMonster(
      'campaign-id',
      { name: 'Atropal', sheet: createEmptyMonsterSheet() },
      () => 'monster-id',
      now,
    );

    expect(
      updateMonster(
        monster,
        { name: ' Atropal ancien ', sheet: { ...monster.sheet, armorClass: 16 } },
        () => new Date('2026-08-14T13:00:00.000Z'),
      ),
    ).toMatchObject({
      campaignId: 'campaign-id',
      name: 'Atropal ancien',
      sheet: { armorClass: 16 },
      updatedAt: '2026-08-14T13:00:00.000Z',
    });
  });
});

describe('monsterTypeLine', () => {
  it('lists the known size, type and alignment', () => {
    expect(
      monsterTypeLine({
        size: 'Grande',
        creatureType: 'Mort-vivant',
        alignment: 'Chaotique mauvais',
      }),
    ).toBe('Grande, Mort-vivant, Chaotique mauvais');
    expect(monsterTypeLine({ size: '', creatureType: '', alignment: '' })).toBe(
      'Type non renseigné',
    );
  });
});
