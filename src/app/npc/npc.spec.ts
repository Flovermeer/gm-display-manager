import { createNpc, updateNpc, type NpcFactoryDependencies } from './npc';

describe('Npc', () => {
  const dependencies: NpcFactoryDependencies = {
    createId: () => 'npc-id',
    now: () => new Date('2026-08-12T18:30:00.000Z'),
  };

  it('creates a normalized active NPC', () => {
    expect(
      createNpc(
        {
          campaignId: 'campaign-id',
          name: '  Syndra Silvane  ',
          summary: '  Commanditaire  ',
          notes: '  Souffre de la malédiction.  ',
        },
        dependencies,
      ),
    ).toEqual({
      id: 'npc-id',
      campaignId: 'campaign-id',
      name: 'Syndra Silvane',
      status: 'active',
      summary: 'Commanditaire',
      notes: 'Souffre de la malédiction.',
      portraitPath: null,
      idleVideoPath: null,
      sheet: {},
      sheetSchemaVersion: 1,
      createdAt: '2026-08-12T18:30:00.000Z',
      updatedAt: '2026-08-12T18:30:00.000Z',
    });
  });

  it('updates editable fields without replacing system data', () => {
    const npc = createNpc({ campaignId: 'campaign-id', name: 'Syndra' }, dependencies);

    expect(
      updateNpc(
        { ...npc, sheet: { armorClass: 12 } },
        {
          name: ' Syndra Silvane ',
          status: 'missing',
          summary: ' Commanditaire ',
          notes: ' Introuvable ',
        },
        () => new Date('2026-08-13T10:00:00.000Z'),
      ),
    ).toMatchObject({
      id: 'npc-id',
      name: 'Syndra Silvane',
      status: 'missing',
      summary: 'Commanditaire',
      notes: 'Introuvable',
      sheet: { armorClass: 12 },
      updatedAt: '2026-08-13T10:00:00.000Z',
    });
  });

  it('rejects an empty name', () => {
    expect(() => createNpc({ campaignId: 'campaign-id', name: '  ' }, dependencies)).toThrow(
      'NPC name is required.',
    );
  });
});
