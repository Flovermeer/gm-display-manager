import { TestBed } from '@angular/core/testing';

import { CombatService } from '@app/features/combat/application/combat.service';
import { CombatRepository } from '@app/features/combat/data-access/combat.repository';
import { InMemoryCombatRepository } from '@app/features/combat/data-access/in-memory-combat.repository';
import { playerCharacterCombatantSource } from '@app/features/combat/domain/combatant-source';
import { InMemoryPlayerCharacterRepository } from '@app/features/players/data-access/in-memory-player-character.repository';
import { PlayerCharacterRepository } from '@app/features/players/data-access/player-character.repository';
import {
  createPlayerCharacter,
  EMPTY_PLAYER_CHARACTER_SHEET,
} from '@app/features/players/domain/player-character';

describe('CombatService', () => {
  let service: CombatService;
  let characters: InMemoryPlayerCharacterRepository;

  beforeEach(() => {
    characters = new InMemoryPlayerCharacterRepository();
    TestBed.configureTestingModule({
      providers: [
        CombatService,
        { provide: CombatRepository, useClass: InMemoryCombatRepository },
        { provide: PlayerCharacterRepository, useValue: characters },
      ],
    });
    service = TestBed.inject(CombatService);
  });

  it('creates the active combat on the first addition', async () => {
    const combat = await service.add('campaign-id', npcSource);
    expect(combat.campaignId).toBe('campaign-id');
    expect(combat.combatants).toHaveLength(1);
    await expect(service.findActive('campaign-id')).resolves.toMatchObject({ id: combat.id });
  });

  it('keeps player hit points in campaign state instead of the combat repository', async () => {
    const character = createPlayerCharacter(
      'campaign-id',
      {
        name: 'Artus',
        playerName: 'Alice',
        status: 'active',
        currentHitPoints: 20,
        maxHitPoints: 20,
        sheet: EMPTY_PLAYER_CHARACTER_SHEET,
      },
      { createId: () => 'player-id', now: () => new Date('2026-08-20T12:00:00.000Z') },
    );
    await characters.save(character);
    const combat = await service.add('campaign-id', playerCharacterCombatantSource(character));
    await service.setHitPoints(combat, combat.combatants[0]!.id, 7, 24);

    await expect(characters.findById('campaign-id', 'player-id')).resolves.toMatchObject({
      currentHitPoints: 7,
      maxHitPoints: 24,
    });
    await expect(service.findActive('campaign-id')).resolves.toMatchObject({
      combatants: [{ currentHitPoints: 7, maxHitPoints: 24 }],
    });
  });

  it('deletes the combat without altering the campaign characters', async () => {
    await service.add('campaign-id', npcSource);
    await service.end('campaign-id');
    await expect(service.findActive('campaign-id')).resolves.toBeNull();
  });
});

const npcSource = {
  kind: 'npc' as const,
  resourceId: 'npc-id',
  name: 'Ras Nsi',
  currentHitPoints: 15,
  maxHitPoints: 15,
};
