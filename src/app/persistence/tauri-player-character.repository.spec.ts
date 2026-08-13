import Database from '@tauri-apps/plugin-sql';

import {
  EMPTY_PLAYER_CHARACTER_SHEET,
  type PlayerCharacter,
} from '../player-character/player-character';
import { TauriPlayerCharacterRepository } from './tauri-player-character.repository';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

describe('TauriPlayerCharacterRepository', () => {
  const database = { select: vi.fn(), execute: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue(undefined);
  });

  it('maps player character rows for one campaign', async () => {
    database.select.mockResolvedValue([characterRow]);
    const repository = new TauriPlayerCharacterRepository();

    await expect(repository.listByCampaign('campaign-id')).resolves.toEqual([
      { ...character, sheetSchemaVersion: 1 },
    ]);
    expect(database.select).toHaveBeenCalledWith(expect.stringContaining('campaign_id = $1'), [
      'campaign-id',
    ]);
  });

  it('persists hit points and the versioned reference sheet', async () => {
    const repository = new TauriPlayerCharacterRepository();
    await repository.save(character);

    expect(database.execute).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT(id)'), [
      'character-id',
      'campaign-id',
      'Nyssa',
      'Flore',
      'active',
      18,
      24,
      'campaigns/campaign-id/media/player-character-portraits/nyssa.webp',
      JSON.stringify(character.sheet),
      2,
      '2026-08-12T18:30:00.000Z',
      '2026-08-12T18:30:00.000Z',
    ]);
  });
});

const character: PlayerCharacter = {
  id: 'character-id',
  campaignId: 'campaign-id',
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
  sheetSchemaVersion: 2,
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
};
