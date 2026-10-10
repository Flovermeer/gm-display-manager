import { TestBed } from '@angular/core/testing';

import { InMemoryLocationRepository } from '@app/features/locations/data-access/in-memory-location.repository';
import type { Location } from '@app/features/locations/domain/location';
import { LocationRepository } from '@app/features/locations/data-access/location.repository';
import { LocationService } from '@app/features/locations/application/location.service';
import {
  createEmptyRichTextDocument,
  type RichTextDocument,
} from '@app/shared/rich-text-editor/rich-text-document';

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

  it('promotes the missing local parent chain with the selected location', async () => {
    const chult = await service.create('campaign-id', locationInput('Chult'));
    const port = await service.create('campaign-id', {
      ...locationInput('Port Nyanzaru'),
      parentLocationId: chult.id,
    });

    await expect(service.promotionPlan(port)).resolves.toMatchObject([
      { id: chult.id, provenance: 'campaign' },
      { id: port.id, provenance: 'campaign' },
    ]);
    await service.promote(port);

    await expect(service.list('campaign-id')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: chult.id, provenance: 'universe' }),
        expect.objectContaining({ id: port.id, provenance: 'universe' }),
      ]),
    );
  });

  it('stores campaign edits as an override that can be reset', async () => {
    const canonical = await service.create('campaign-id', locationInput('Chult'));
    await service.promote(canonical);
    const shared = (await service.list('campaign-id')).find(({ id }) => id === canonical.id)!;

    await service.update(shared, { ...locationInput('Chult revisité'), parentLocationId: null });
    await expect(service.list('campaign-id')).resolves.toContainEqual(
      expect.objectContaining({ id: canonical.id, name: 'Chult revisité', provenance: 'override' }),
    );

    await service.resetOverride({ ...shared, provenance: 'override' });
    await expect(service.list('campaign-id')).resolves.toContainEqual(
      expect.objectContaining({ id: canonical.id, name: 'Chult', provenance: 'universe' }),
    );
  });

  it('keeps the detailed description scoped to each campaign', async () => {
    const canonical = await service.create('campaign-one', locationInput('Chult'));
    await service.promote(canonical);
    await service.attach('campaign-two', canonical.id);

    const campaignOneLocation = (await service.list('campaign-one'))[0];
    const campaignTwoLocation = (await service.list('campaign-two'))[0];
    const campaignOneDescription = richText('Description de la première campagne.');

    await service.update(campaignOneLocation, {
      ...locationInput(campaignOneLocation.name),
      description: campaignOneDescription,
    });

    await expect(service.list('campaign-one')).resolves.toContainEqual(
      expect.objectContaining({ description: campaignOneDescription }),
    );
    await expect(service.list('campaign-two')).resolves.toContainEqual(
      expect.objectContaining({ description: createEmptyRichTextDocument() }),
    );
    expect(campaignTwoLocation.description).not.toEqual(campaignOneDescription);
  });
});

function locationInput(name: string) {
  return { parentLocationId: null, name, summary: '', notes: '' };
}

function richText(text: string): RichTextDocument {
  return {
    schemaVersion: 1,
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
  };
}
