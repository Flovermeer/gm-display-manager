import {
  addCombatant,
  createActiveCombat,
  removeCombatant,
  updateCombatantHitPoints,
  updateCombatantInitiative,
  type CombatFactoryDependencies,
} from '@app/features/combat/domain/combat';

describe('combat domain', () => {
  const dependencies: CombatFactoryDependencies = {
    createId: vi.fn(),
    now: () => new Date('2026-08-20T12:00:00.000Z'),
  };

  beforeEach(() => {
    vi.mocked(dependencies.createId)
      .mockReset()
      .mockReturnValueOnce('combat-id')
      .mockReturnValueOnce('combatant-1')
      .mockReturnValueOnce('combatant-2')
      .mockReturnValueOnce('combatant-3');
  });

  it('creates one combat and numbers repeated monster instances', () => {
    let combat = createActiveCombat('campaign-id', dependencies);
    combat = addCombatant(combat, monsterSource, undefined, dependencies);
    combat = addCombatant(combat, monsterSource, undefined, dependencies);

    expect(combat.combatants.map(({ displayName }) => displayName)).toEqual([
      'Gobelin 1',
      'Gobelin 2',
    ]);
  });

  it('rejects duplicate player characters and NPCs', () => {
    const combat = addCombatant(
      createActiveCombat('campaign-id', dependencies),
      npcSource,
      undefined,
      dependencies,
    );

    expect(() => addCombatant(combat, npcSource, undefined, dependencies)).toThrow(
      'participe d\u00e9j\u00e0',
    );
  });

  it('sorts ties by player character, NPC, monster, then insertion order', () => {
    let combat = createActiveCombat('campaign-id', dependencies);
    combat = addCombatant(combat, monsterSource, undefined, dependencies);
    combat = addCombatant(combat, npcSource, undefined, dependencies);
    combat = addCombatant(combat, playerSource, undefined, dependencies);

    expect(combat.combatants.map(({ kind }) => kind)).toEqual([
      'player-character',
      'npc',
      'monster',
    ]);
    combat = updateCombatantInitiative(combat, 'combatant-1', 18);
    expect(combat.combatants[0]?.kind).toBe('monster');
  });

  it('clamps hit points to the official zero-to-maximum range', () => {
    let combat = addCombatant(
      createActiveCombat('campaign-id', dependencies),
      npcSource,
      undefined,
      dependencies,
    );
    combat = updateCombatantHitPoints(combat, 'combatant-1', -12, 15);
    expect(combat.combatants[0]).toMatchObject({ currentHitPoints: 0, maxHitPoints: 15 });
    combat = updateCombatantHitPoints(combat, 'combatant-1', 30, 15);
    expect(combat.combatants[0]?.currentHitPoints).toBe(15);
  });

  it('requires a maximum before adding a combatant', () => {
    const combat = createActiveCombat('campaign-id', dependencies);
    expect(() =>
      addCombatant(combat, { ...npcSource, currentHitPoints: null, maxHitPoints: null }),
    ).toThrow('PV maximum');
  });

  it('removes a combatant explicitly without ending the combat', () => {
    let combat = addCombatant(
      createActiveCombat('campaign-id', dependencies),
      npcSource,
      undefined,
      dependencies,
    );
    combat = removeCombatant(combat, 'combatant-1');
    expect(combat.combatants).toEqual([]);
  });
});

const monsterSource = {
  kind: 'monster' as const,
  resourceId: 'monster-id',
  name: 'Gobelin',
  currentHitPoints: 7,
  maxHitPoints: 7,
};

const npcSource = {
  kind: 'npc' as const,
  resourceId: 'npc-id',
  name: 'Ras Nsi',
  currentHitPoints: 15,
  maxHitPoints: 15,
};

const playerSource = {
  kind: 'player-character' as const,
  resourceId: 'player-id',
  name: 'Artus',
  currentHitPoints: 20,
  maxHitPoints: 20,
};
