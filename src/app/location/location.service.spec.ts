import { TestBed } from '@angular/core/testing';

import { InMemoryLocationRepository } from '../persistence/in-memory-location.repository';
import type { Location } from './location';
import { LocationRepository } from './location.repository';
import { LocationService } from './location.service';

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LocationService,
        { provide: LocationRepository, useClass: InMemoryLocationRepository },
      ],
    });
    service = TestBed.inject(LocationService);
  });

  it('creates, nests, updates and deletes campaign locations', async () => {
    const chult = await service.create('campaign-id', locationInput('Chult'));
    const port = await service.create('campaign-id', {
      ...locationInput('Port Nyanzaru'),
      parentLocationId: chult.id,
    });
    const updated = await service.update(
      port,
      { ...locationInput('Port Nyanzaru'), parentLocationId: chult.id, notes: 'Port marchand' },
      'campaigns/campaign-id/media/locations/port.webp',
    );

    expect(updated.imagePath).toContain('/media/locations/');
    await service.delete(chult);
    await expect(service.list('campaign-id')).resolves.toMatchObject([
      { id: port.id, parentLocationId: null },
    ] satisfies Partial<Location>[]);
  });

  it('never accepts a parent from another campaign', async () => {
    const foreignParent = await service.create('other-campaign', locationInput('Étrangère'));

    await expect(
      service.create('campaign-id', {
        ...locationInput('Enfant'),
        parentLocationId: foreignParent.id,
      }),
    ).rejects.toThrow("Le lieu parent n'appartient pas à cette campagne.");
  });

  it('rejects hierarchy cycles', async () => {
    const chult = await service.create('campaign-id', locationInput('Chult'));
    const port = await service.create('campaign-id', {
      ...locationInput('Port Nyanzaru'),
      parentLocationId: chult.id,
    });

    await expect(
      service.update(chult, { ...locationInput('Chult'), parentLocationId: port.id }),
    ).rejects.toThrow('Un lieu ne peut pas être placé dans un de ses descendants.');
  });
});

function locationInput(name: string) {
  return { parentLocationId: null, name, summary: '', notes: '' };
}
