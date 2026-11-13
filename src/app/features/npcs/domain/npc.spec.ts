import {
  createEmptyNpcSheet,
  createNpc,
  NPC_SHEET_SCHEMA_VERSION,
  normalizeNpcSheet,
  npcPlayerDisplayState,
  npcStatusIcon,
  npcStatusLabel,
  npcTypeLine,
  updateNpc,
  type NpcFactoryDependencies,
} from '@app/features/npcs/domain/npc';

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
      provenance: 'campaign',
      name: 'Syndra Silvane',
      status: 'active',
      summary: 'Commanditaire',
      notes: 'Souffre de la malédiction.',
      portraitPath: null,
      idleVideoPath: null,
      sheet: createEmptyNpcSheet(),
      sheetSchemaVersion: NPC_SHEET_SCHEMA_VERSION,
      createdAt: '2026-08-12T18:30:00.000Z',
      updatedAt: '2026-08-12T18:30:00.000Z',
    });
  });

  it('updates editable fields without replacing system data', () => {
    const npc = createNpc({ campaignId: 'campaign-id', name: 'Syndra' }, dependencies);

    expect(
      updateNpc(
        { ...npc, sheet: { ...createEmptyNpcSheet(), armorClass: 12 } },
        {
          name: ' Syndra Silvane ',
          status: 'missing',
          summary: ' Commanditaire ',
          notes: ' Introuvable ',
          sheet: { ...createEmptyNpcSheet(), armorClass: 14 },
        },
        () => new Date('2026-08-13T10:00:00.000Z'),
      ),
    ).toMatchObject({
      id: 'npc-id',
      name: 'Syndra Silvane',
      status: 'missing',
      summary: 'Commanditaire',
      notes: 'Introuvable',
      sheet: { ...createEmptyNpcSheet(), armorClass: 14 },
      sheetSchemaVersion: NPC_SHEET_SCHEMA_VERSION,
      updatedAt: '2026-08-13T10:00:00.000Z',
    });
  });

  it('rejects an empty name', () => {
    expect(() => createNpc({ campaignId: 'campaign-id', name: '  ' }, dependencies)).toThrow(
      'NPC name is required.',
    );
  });

  it('keeps legacy creature identity as the race when reading an older NPC sheet', () => {
    expect(
      normalizeNpcSheet({
        creatureType: 'Humanoïde',
        creatureSubspecies: 'Elfe',
      }),
    ).toMatchObject({
      raceOptionId: null,
      race: 'Elfe',
      classOptionId: null,
      className: '',
      occupation: '',
    });
  });

  it('normalizes the character species and subspecies references', () => {
    expect(
      normalizeNpcSheet({
        raceOptionId: 'elf-id',
        race: ' Elfe ',
        subraceOptionId: 'drow-id',
        subrace: ' Drow ',
      }),
    ).toMatchObject({
      raceOptionId: 'elf-id',
      race: 'Elfe',
      subraceOptionId: 'drow-id',
      subrace: 'Drow',
    });
  });
});

describe('Npc player display', () => {
  const npc = { id: 'mira', name: 'Mira Vell' };

  it('shows the portrait and adds the idle video only when it exists', () => {
    expect(npcPlayerDisplayState(npc, { portraitUrl: 'mira.webp' })).toEqual({
      mode: 'npc',
      npcId: 'mira',
      name: 'Mira Vell',
      portraitPath: 'mira.webp',
    });
    expect(
      npcPlayerDisplayState(npc, { portraitUrl: 'mira.webp', idleVideoUrl: 'mira.webm' }),
    ).toHaveProperty('idleVideoPath', 'mira.webm');
  });
});

describe('Npc labels', () => {
  it('labels every NPC status with text and icon', () => {
    expect(npcStatusLabel('retired')).toBe('Retiré');
    expect(npcStatusIcon('dead')).toBe('💀');
  });

  it('builds the type line from the known identity fields only', () => {
    expect(
      npcTypeLine({
        ...createEmptyNpcSheet(),
        size: 'Moyenne',
        race: 'Elfe',
        subrace: 'Haut-elfe',
        alignment: 'Neutre bon',
      }),
    ).toBe('Moyenne, Elfe, Haut-elfe, Neutre bon');
    expect(npcTypeLine(createEmptyNpcSheet())).toBe('—');
  });
});
