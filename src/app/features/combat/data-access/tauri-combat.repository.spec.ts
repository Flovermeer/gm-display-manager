import Database from '@tauri-apps/plugin-sql';

import { TauriCombatRepository } from '@app/features/combat/data-access/tauri-combat.repository';
import type { ActiveCombat } from '@app/features/combat/domain/combat';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

describe('TauriCombatRepository', () => {
  const database = { select: vi.fn(), execute: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue({ rowsAffected: 1 });
  });

  it('loads the active combat and its persisted participants', async () => {
    database.select
      .mockResolvedValueOnce([
        {
          id: 'combat-id',
          campaign_id: 'campaign-id',
          started_at: timestamp,
          updated_at: timestamp,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'combatant-id',
          combat_id: 'combat-id',
          kind: 'monster',
          resource_id: 'monster-id',
          display_name: 'Gobelin 1',
          initiative: 12,
          current_hit_points: 7,
          max_hit_points: 7,
          added_order: 0,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ]);

    await expect(new TauriCombatRepository().findActive('campaign-id')).resolves.toMatchObject({
      id: 'combat-id',
      combatants: [{ displayName: 'Gobelin 1', currentHitPoints: 7 }],
    });
  });

  it('never persists a duplicate player-character hit-point pool', async () => {
    const repository = new TauriCombatRepository();
    const player = combat.combatants[0]!;
    await repository.saveCombatant(combat, player);

    expect(database.execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO combatant'),
      expect.arrayContaining(['player-character', null, null]),
    );
  });
});

const timestamp = '2026-08-20T12:00:00.000Z';
const combat: ActiveCombat = {
  id: 'combat-id',
  campaignId: 'campaign-id',
  startedAt: timestamp,
  updatedAt: timestamp,
  combatants: [
    {
      id: 'combatant-id',
      combatId: 'combat-id',
      kind: 'player-character',
      resourceId: 'player-id',
      displayName: 'Artus',
      initiative: 14,
      currentHitPoints: 12,
      maxHitPoints: 20,
      addedOrder: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
};
