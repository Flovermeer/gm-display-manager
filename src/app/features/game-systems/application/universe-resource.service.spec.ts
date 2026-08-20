import { TestBed } from '@angular/core/testing';

import { UniverseResourceService } from '@app/features/game-systems/application/universe-resource.service';
import { InMemoryUniverseResourceRepository } from '@app/features/game-systems/data-access/in-memory-universe-resource.repository';
import { UniverseResourceRepository } from '@app/features/game-systems/data-access/universe-resource.repository';

describe('UniverseResourceService', () => {
  let service: UniverseResourceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UniverseResourceService,
        { provide: UniverseResourceRepository, useClass: InMemoryUniverseResourceRepository },
      ],
    });
    service = TestBed.inject(UniverseResourceService);
  });

  it.each(['npc', 'player-character', 'location', 'monster'] as const)(
    'creates and reloads a canonical %s',
    async (type) => {
      const draft = service.createDraft('universe-id', type);

      const saved = await service.save({ ...draft, name: '  Ressource canonique  ' });

      expect(saved.name).toBe('Ressource canonique');
      await expect(service.find('universe-id', type, draft.id)).resolves.toEqual(saved);
      await expect(service.list('universe-id', type)).resolves.toEqual([
        expect.objectContaining({ id: draft.id, campaignCount: 0 }),
      ]);
    },
  );

  it('validates and stores a canonical narrative item', async () => {
    const draft = service.createDraft('universe-id', 'item');

    const saved = await service.save({
      ...draft,
      name: '  Clef de la crypte  ',
      itemTypeId: 'type-id',
      attunement: 'conditional',
      attunementCondition: '  réservée au gardien  ',
    });

    expect(saved).toMatchObject({
      name: 'Clef de la crypte',
      attunementCondition: 'réservée au gardien',
    });
  });

  it('rejects a location that is its own parent', async () => {
    const draft = service.createDraft('universe-id', 'location');

    await expect(
      service.save({ ...draft, name: 'Boucle', parentLocationId: draft.id }),
    ).rejects.toThrow('Un lieu ne peut pas être son propre parent.');
  });
});
