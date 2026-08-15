import {
  createLocation,
  updateLocation,
  type LocationFactoryDependencies,
} from '@app/features/locations/domain/location';

describe('Location', () => {
  const dependencies: LocationFactoryDependencies = {
    createId: () => 'location-id',
    now: () => new Date('2026-08-12T18:30:00.000Z'),
  };

  it('creates a normalized root location', () => {
    expect(
      createLocation(
        {
          campaignId: 'campaign-id',
          name: '  Port Nyanzaru  ',
          summary: '  Grande cité portuaire  ',
          notes: '  Point de départ.  ',
        },
        dependencies,
      ),
    ).toEqual({
      id: 'location-id',
      campaignId: 'campaign-id',
      provenance: 'campaign',
      parentLocationId: null,
      name: 'Port Nyanzaru',
      summary: 'Grande cité portuaire',
      notes: 'Point de départ.',
      imagePath: null,
      createdAt: '2026-08-12T18:30:00.000Z',
      updatedAt: '2026-08-12T18:30:00.000Z',
    });
  });

  it('updates editable fields and preserves the illustration', () => {
    const location = {
      ...createLocation({ campaignId: 'campaign-id', name: 'Port' }, dependencies),
      imagePath: 'campaigns/campaign-id/media/locations/port.webp',
    };

    expect(
      updateLocation(
        location,
        {
          parentLocationId: 'chult-id',
          name: ' Port Nyanzaru ',
          summary: ' Cité portuaire ',
          notes: ' Marchands ',
        },
        () => new Date('2026-08-13T10:00:00.000Z'),
      ),
    ).toMatchObject({
      parentLocationId: 'chult-id',
      name: 'Port Nyanzaru',
      summary: 'Cité portuaire',
      notes: 'Marchands',
      imagePath: 'campaigns/campaign-id/media/locations/port.webp',
      updatedAt: '2026-08-13T10:00:00.000Z',
    });
  });

  it('rejects an empty name and itself as parent', () => {
    expect(() => createLocation({ campaignId: 'campaign-id', name: '  ' }, dependencies)).toThrow(
      'Location name is required.',
    );
    const location = createLocation({ campaignId: 'campaign-id', name: 'Chult' }, dependencies);
    expect(() =>
      updateLocation(location, {
        parentLocationId: location.id,
        name: location.name,
        summary: '',
        notes: '',
      }),
    ).toThrow('A location cannot be its own parent.');
  });
});
