import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MonsterService } from '@app/features/bestiary/application/monster.service';
import { CombatStore } from '@app/features/combat/application/combat.store';
import type { ActiveCombat, Combatant } from '@app/features/combat/domain/combat';
import { CombatPanel } from '@app/features/combat/ui/combat-panel/combat-panel';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { PlayerCharacterService } from '@app/features/players/application/player-character.service';

describe('CombatPanel', () => {
  const setHitPoints = vi.fn();
  const store = {
    combat: signal<ActiveCombat | null>(null),
    isOpen: signal(true),
    isBusy: signal(false),
    error: signal<string | null>(null),
    pendingMaximum: signal(null),
    close: vi.fn(),
    requestAdd: vi.fn(),
    confirmMaximum: vi.fn(),
    cancelMaximum: vi.fn(),
    setInitiative: vi.fn(),
    setHitPoints,
    renameMonster: vi.fn(),
    remove: vi.fn(),
    end: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    store.combat.set(combat);
    store.isOpen.set(true);
    store.error.set(null);
  });

  it('shows zero-hit-point participants without removing them', async () => {
    const fixture = await createFixture();
    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Hors combat');
    expect(text).toContain('Mort');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.combatant')).toHaveLength(2);
  });

  it('applies quick damage through the combat store', async () => {
    const fixture = await createFixture();
    const firstDamageButton = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    ].find((button) => button.textContent?.includes('D\u00e9g\u00e2ts'));
    firstDamageButton?.click();
    await fixture.whenStable();

    expect(setHitPoints).toHaveBeenCalledWith(combat.combatants[0], -1, 20);
  });

  async function createFixture() {
    await TestBed.configureTestingModule({
      imports: [CombatPanel],
      providers: [
        { provide: CombatStore, useValue: store },
        { provide: PlayerCharacterService, useValue: { list: vi.fn().mockResolvedValue([]) } },
        { provide: NpcService, useValue: { list: vi.fn().mockResolvedValue([]) } },
        { provide: MonsterService, useValue: { list: vi.fn().mockResolvedValue([]) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CombatPanel);
    fixture.componentRef.setInput('campaignId', 'campaign-id');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }
});

const timestamp = '2026-08-20T12:00:00.000Z';
const player: Combatant = {
  id: 'player-combatant',
  combatId: 'combat-id',
  kind: 'player-character',
  resourceId: 'player-id',
  displayName: 'Artus',
  initiative: 12,
  currentHitPoints: 0,
  maxHitPoints: 20,
  addedOrder: 0,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const monster: Combatant = {
  ...player,
  id: 'monster-combatant',
  kind: 'monster',
  resourceId: 'monster-id',
  displayName: 'Gobelin 1',
  initiative: 8,
  maxHitPoints: 7,
  addedOrder: 1,
};
const combat: ActiveCombat = {
  id: 'combat-id',
  campaignId: 'campaign-id',
  startedAt: timestamp,
  updatedAt: timestamp,
  combatants: [player, monster],
};
