import { TestBed } from '@angular/core/testing';

import { PlayerCharacterService } from '@app/features/players/application/player-character.service';
import { InMemoryPlayerCharacterRepository } from '@app/features/players/data-access/in-memory-player-character.repository';
import { PlayerCharacterRepository } from '@app/features/players/data-access/player-character.repository';
import {
  EMPTY_PLAYER_CHARACTER_SHEET,
  type UpdatePlayerCharacterInput,
} from '@app/features/players/domain/player-character';

describe('PlayerCharacterService sharing', () => {
  let service: PlayerCharacterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PlayerCharacterService,
        { provide: PlayerCharacterRepository, useClass: InMemoryPlayerCharacterRepository },
      ],
    });
    service = TestBed.inject(PlayerCharacterService);
  });

  it('keeps hit points local without creating a sheet override', async () => {
    const local = await service.create('campaign-id', input('Nyssa'));
    await service.promote(local);
    const canonical = (await service.list('campaign-id'))[0]!;

    await service.updateHitPoints(canonical, 6);

    await expect(service.list('campaign-id')).resolves.toContainEqual(
      expect.objectContaining({
        id: local.id,
        currentHitPoints: 6,
        provenance: 'universe',
      }),
    );
  });

  it('resets a campaign sheet override without losing its local state', async () => {
    const local = await service.create('campaign-id', input('Nyssa'));
    await service.promote(local);
    const canonical = (await service.list('campaign-id'))[0]!;
    const customized = await service.update(canonical, {
      ...input('Nyssa de Chult'),
      playerName: 'Flore',
      currentHitPoints: 5,
    });

    expect(customized.provenance).toBe('universe');
    await expect(service.list('campaign-id')).resolves.toContainEqual(
      expect.objectContaining({
        name: 'Nyssa de Chult',
        playerName: 'Flore',
        provenance: 'override',
      }),
    );

    await service.resetOverride({ ...customized, provenance: 'override' });
    await expect(service.list('campaign-id')).resolves.toContainEqual(
      expect.objectContaining({
        name: 'Nyssa',
        playerName: 'Flore',
        currentHitPoints: 5,
        provenance: 'universe',
      }),
    );
  });

  it('imports a canonical character with fresh campaign state', async () => {
    const local = await service.create('first-campaign', {
      ...input('Nyssa'),
      playerName: 'Flore',
      currentHitPoints: 5,
    });
    await service.promote(local);

    const available = await service.listAvailable('second-campaign');
    await service.attach('second-campaign', available[0]!.id);

    await expect(service.list('second-campaign')).resolves.toContainEqual(
      expect.objectContaining({
        name: 'Nyssa',
        playerName: '',
        currentHitPoints: 10,
        provenance: 'universe',
      }),
    );
  });
});

function input(name: string): UpdatePlayerCharacterInput {
  return {
    name,
    playerName: '',
    status: 'active',
    currentHitPoints: 10,
    maxHitPoints: 10,
    sheet: EMPTY_PLAYER_CHARACTER_SHEET,
  };
}
