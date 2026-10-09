import Database from '@tauri-apps/plugin-sql';

import {
  EMPTY_PLAYER_CHARACTER_SHEET,
  type PlayerCharacter,
} from '@app/features/players/domain/player-character';
import { TauriPlayerCharacterRepository } from '@app/features/players/data-access/tauri-player-character.repository';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

describe('TauriPlayerCharacterRepository', () => {
  const database = { select: vi.fn(), execute: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue({ rowsAffected: 1 });
  });

  it('maps player character rows for one campaign', async () => {
    database.select.mockResolvedValue([characterRow]);
    const repository = new TauriPlayerCharacterRepository();

    await expect(repository.listByCampaign('campaign-id')).resolves.toEqual([
      { ...character, sheetSchemaVersion: 1 },
    ]);
    expect(database.select).toHaveBeenCalledWith(expect.stringContaining('campaign_id=$1'), [
      'campaign-id',
    ]);
  });

  it('persists hit points and the versioned reference sheet', async () => {
    const repository = new TauriPlayerCharacterRepository();
    await repository.save(character);

    expect(database.execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('ON CONFLICT(id)'),
      [
        'character-id',
        'campaign-id',
        'Nyssa',
        24,
        'campaigns/campaign-id/media/player-character-portraits/nyssa.webp',
        JSON.stringify(character.sheet),
        3,
        '2026-08-12T18:30:00.000Z',
        '2026-08-12T18:30:00.000Z',
      ],
    );
    expect(database.execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('campaign_player_character'),
      [
        'campaign-id',
        'character-id',
        'Flore',
        'active',
        18,
        '2026-08-12T18:30:00.000Z',
        '2026-08-12T18:30:00.000Z',
      ],
    );
  });

  it('maps the legacy species field to race', async () => {
    database.select.mockResolvedValue([
      {
        ...characterRow,
        sheet_json: JSON.stringify({ species: 'Elfe', className: 'Rôdeuse' }),
      },
    ]);
    const repository = new TauriPlayerCharacterRepository();

    await expect(repository.listByCampaign('campaign-id')).resolves.toEqual([
      expect.objectContaining({
        sheet: expect.objectContaining({
          raceOptionId: null,
          race: 'Elfe',
          classOptionId: null,
          className: 'Rôdeuse',
        }),
      }),
    ]);
  });
});

const character: PlayerCharacter = {
  id: 'character-id',
  campaignId: 'campaign-id',
  provenance: 'campaign',
  name: 'Nyssa',
  playerName: 'Flore',
  status: 'active',
  currentHitPoints: 18,
  maxHitPoints: 24,
  portraitPath: 'campaigns/campaign-id/media/player-character-portraits/nyssa.webp',
  sheet: {
    ...EMPTY_PLAYER_CHARACTER_SHEET,
    className: 'Rôdeuse',
    level: 3,
    senses: ['Vision dans le noir 18 m'],
    languages: ['Commun'],
    conditions: ['Empoisonné'],
  },
  sheetSchemaVersion: 3,
  createdAt: '2026-08-12T18:30:00.000Z',
  updatedAt: '2026-08-12T18:30:00.000Z',
};

const characterRow = {
  id: 'character-id',
  campaign_id: 'campaign-id',
  name: 'Nyssa',
  player_name: 'Flore',
  status: 'active',
  current_hit_points: 18,
  max_hit_points: 24,
  portrait_path: 'campaigns/campaign-id/media/player-character-portraits/nyssa.webp',
  sheet_json: JSON.stringify({
    ...EMPTY_PLAYER_CHARACTER_SHEET,
    className: 'Rôdeuse',
    level: 3,
    senses: 'Vision dans le noir 18 m',
    languages: 'Commun',
    conditions: 'Empoisonné',
  }),
  sheet_schema_version: 1,
  created_at: '2026-08-12T18:30:00.000Z',
  updated_at: '2026-08-12T18:30:00.000Z',
  source_campaign_id: 'campaign-id',
  override_snapshot: null,
};
