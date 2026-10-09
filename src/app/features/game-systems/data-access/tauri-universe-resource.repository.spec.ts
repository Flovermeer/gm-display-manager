import Database from '@tauri-apps/plugin-sql';

import { TauriUniverseResourceRepository } from '@app/features/game-systems/data-access/tauri-universe-resource.repository';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

describe('TauriUniverseResourceRepository', () => {
  const database = { select: vi.fn(), execute: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue({ rowsAffected: 1 });
  });

  it('lists canonical resources with their campaign usage', async () => {
    database.select.mockResolvedValue([
      {
        id: 'npc-id',
        universe_id: 'forgotten-realms',
        name: 'Syndra Silvane',
        summary: 'Humanoïde',
        campaign_count: 2,
        deleted_at: null,
      },
    ]);
    const repository = new TauriUniverseResourceRepository();

    await expect(repository.list('forgotten-realms', 'npc')).resolves.toEqual([
      {
        id: 'npc-id',
        universeId: 'forgotten-realms',
        type: 'npc',
        name: 'Syndra Silvane',
        summary: 'Humanoïde',
        campaignCount: 2,
        deletedAt: null,
      },
    ]);
    expect(database.select).toHaveBeenCalledWith(
      expect.stringContaining('resource.source_campaign_id IS NULL'),
      ['forgotten-realms'],
    );
  });

  it('moves only canonical resources from the requested universe to trash', async () => {
    const repository = new TauriUniverseResourceRepository();

    await repository.trash('forgotten-realms', 'monster', 'monster-id');

    expect(database.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE monster'), [
      'forgotten-realms',
      'monster-id',
    ]);
  });

  it('loads the complete canonical NPC sheet without campaign state', async () => {
    database.select.mockResolvedValue([
      {
        id: 'npc-id',
        universe_id: 'forgotten-realms',
        name: 'Syndra Silvane',
        image_path: 'universes/forgotten-realms/media/npc-portraits/syndra.webp',
        idle_video_path: null,
        sheet_json: JSON.stringify({ creatureType: 'Humanoïde' }),
        sheet_schema_version: 4,
        deleted_at: null,
        created_at: '2026-08-20T00:00:00.000Z',
        updated_at: '2026-08-20T00:00:00.000Z',
      },
    ]);
    const repository = new TauriUniverseResourceRepository();

    await expect(repository.find('forgotten-realms', 'npc', 'npc-id')).resolves.toEqual(
      expect.objectContaining({
        id: 'npc-id',
        universeId: 'forgotten-realms',
        type: 'npc',
        sheet: expect.objectContaining({ creatureType: 'Humanoïde' }),
      }),
    );
    expect(database.select).toHaveBeenCalledWith(
      expect.stringContaining('source_campaign_id IS NULL'),
      ['forgotten-realms', 'npc-id'],
    );
  });

  it('saves a canonical monster without creating a campaign association', async () => {
    const repository = new TauriUniverseResourceRepository();
    const serviceSheet = {
      sizeOptionId: null,
      size: '',
      creatureTypeOptionId: null,
      creatureType: 'Aberration',
      creatureSubspeciesOptionId: null,
      creatureSubspecies: '',
      raceOptionId: null,
      race: '',
      classOptionId: null,
      className: '',
      occupation: '',
      alignmentOptionId: null,
      alignment: '',
      armorClass: null,
      armorClassDetails: '',
      hitPoints: null,
      hitPointFormula: '',
      speed: '',
      abilities: {
        strength: null,
        dexterity: null,
        constitution: null,
        intelligence: null,
        wisdom: null,
        charisma: null,
      },
      savingThrows: [],
      skills: [],
      damageVulnerabilities: [],
      damageResistances: [],
      damageImmunities: [],
      conditionImmunities: [],
      senses: [],
      languages: [],
      languageOptionIds: [],
      challengeRating: '',
      experiencePoints: null,
      officialDescription: { schemaVersion: 1 as const, content: { type: 'doc' as const } },
      traits: [],
      actions: [],
      bonusActions: [],
      reactions: [],
      legendaryActions: [],
    };

    await repository.save({
      id: 'monster-id',
      universeId: 'forgotten-realms',
      type: 'monster',
      name: 'Aboleth',
      imagePath: null,
      sheet: serviceSheet,
      deletedAt: null,
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    });

    expect(database.execute).toHaveBeenCalledWith(
      expect.stringContaining('source_campaign_id, deleted_at'),
      expect.arrayContaining(['monster-id', 'forgotten-realms', 'Aboleth']),
    );
    expect(database.execute.mock.calls[0]?.[0]).not.toContain('campaign_monster');
  });
});
