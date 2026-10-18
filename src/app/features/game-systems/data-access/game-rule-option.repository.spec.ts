import Database from '@tauri-apps/plugin-sql';

import { InMemoryGameRuleOptionRepository } from '@app/features/game-systems/data-access/in-memory-game-rule-option.repository';
import { TauriGameRuleOptionRepository } from '@app/features/game-systems/data-access/tauri-game-rule-option.repository';
import type { GameRuleOption } from '@app/features/game-systems/domain/game-rule-option';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

const option: GameRuleOption = {
  id: 'race-id',
  gameSystemId: 'system-id',
  universeId: 'universe-id',
  category: 'race',
  parentOptionId: null,
  code: 'elfe',
  label: 'Elfe',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GameRuleOptionRepository removal', () => {
  it('protects system values and creature types that still have subspecies in memory', async () => {
    const repository = new InMemoryGameRuleOptionRepository();
    const type = { ...option, id: 'type-id', category: 'creature_type' } as GameRuleOption;
    const child = {
      ...option,
      id: 'child-id',
      category: 'creature_subspecies',
      parentOptionId: type.id,
    } as GameRuleOption;
    await repository.save(type);
    await repository.save(child);

    await expect(repository.remove({ ...option, universeId: null })).resolves.toBe(false);
    await expect(repository.remove(type)).resolves.toBe(false);
    await expect(repository.remove(child)).resolves.toBe(true);
    await expect(repository.remove(type)).resolves.toBe(true);
  });

  it('blocks deletion when SQLite reports an existing reference', async () => {
    const database = { execute: vi.fn().mockResolvedValue({ rowsAffected: 0 }) };
    vi.mocked(Database.load).mockResolvedValue(database as never);

    const removed = await new TauriGameRuleOptionRepository().remove(option);

    expect(removed).toBe(false);
    const [statement, parameters] = database.execute.mock.calls[0];
    expect(statement).toContain('child.parent_option_id = $1');
    expect(statement).toContain("FROM npc WHERE json_extract(sheet_json, '$.raceOptionId') = $1");
    expect(statement).toContain(
      "FROM monster WHERE json_extract(sheet_json, '$.raceOptionId') = $1",
    );
    expect(statement).toContain(
      "FROM player_character WHERE json_extract(sheet_json, '$.raceOptionId') = $1",
    );
    expect(statement).toContain("json_extract(snapshot_json, '$.sheet.raceOptionId') = $1");
    expect(parameters).toEqual([option.id, option.universeId]);
  });

  it('checks language arrays in sheets and campaign overrides', async () => {
    const database = { execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }) };
    vi.mocked(Database.load).mockResolvedValue(database as never);

    await expect(
      new TauriGameRuleOptionRepository().remove({ ...option, category: 'language' }),
    ).resolves.toBe(true);
    const [statement] = database.execute.mock.calls[0];
    expect(statement).toContain("json_each(json_extract(sheet_json, '$.languageOptionIds'))");
    expect(statement).toContain(
      "json_each(json_extract(snapshot_json, '$.sheet.languageOptionIds'))",
    );
  });
});

describe('GameRuleOptionRepository catalog inheritance', () => {
  it('includes generic races in a specific universe without leaking another universe', async () => {
    const repository = new InMemoryGameRuleOptionRepository();
    await repository.save({
      ...option,
      id: 'generic-race',
      universeId: 'system-id:generic',
      label: 'Elfe',
    });
    await repository.save({
      ...option,
      id: 'specific-race',
      universeId: 'forgotten-realms',
      code: 'shadar-kai',
      label: 'Shadar-kai',
    });
    await repository.save({
      ...option,
      id: 'other-race',
      universeId: 'greyhawk',
      code: 'baklunien',
      label: 'Baklunien',
    });

    const races = await repository.listForUniverse('system-id', 'forgotten-realms', 'race');

    expect(races.map(({ id }) => id)).toEqual(['generic-race', 'specific-race']);
  });

  it('queries SQLite for both the generic and selected universe scopes', async () => {
    const database = { select: vi.fn().mockResolvedValue([]) };
    vi.mocked(Database.load).mockResolvedValue(database as never);

    await new TauriGameRuleOptionRepository().listForUniverse(
      'system-id',
      'forgotten-realms',
      'race',
    );

    const [statement, parameters] = database.select.mock.calls[0];
    expect(statement).toContain("category IN ('race', 'class') AND universe_id=$3");
    expect(parameters).toEqual([
      'system-id',
      'race',
      'system-id:generic',
      'forgotten-realms',
    ]);
  });
});
