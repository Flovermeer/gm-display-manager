import {
  createLocation,
  locationPlayerDisplayState,
  playerDisplayName,
  updateLocation,
  type LocationFactoryDependencies,
} from '@app/features/locations/domain/location';
import { createEmptyRichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';

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
      description: createEmptyRichTextDocument(),
      notes: 'Point de départ.',
      hideNameOnPlayerDisplay: false,
      imagePaths: [],
      imagePath: null,
      createdAt: '2026-08-12T18:30:00.000Z',
      updatedAt: '2026-08-12T18:30:00.000Z',
    });
  });

  it('updates editable fields and preserves the illustration', () => {
    const location = {
      ...createLocation({ campaignId: 'campaign-id', name: 'Port' }, dependencies),
      imagePaths: ['campaigns/campaign-id/media/locations/port.webp'],
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

  it('normalizes and deduplicates gallery images', () => {
    const location = createLocation(
      {
        campaignId: 'campaign-id',
        name: 'Chult',
        imagePaths: [' map.webp ', 'view.webp', 'map.webp'],
      },
      dependencies,
    );

    expect(location.imagePaths).toEqual(['map.webp', 'view.webp']);
    expect(location.imagePath).toBe('map.webp');
  });
});

describe('Location player display', () => {
  const location = { id: 'tavern', name: 'Taverne du Beholder', hideNameOnPlayerDisplay: false };

  it('shows the location name unless the GM hides it', () => {
    expect(playerDisplayName(location)).toBe('Taverne du Beholder');
    expect(playerDisplayName({ ...location, hideNameOnPlayerDisplay: true })).toBeUndefined();
  });

  it('builds the standalone player display state with the selected image', () => {
    expect(
      locationPlayerDisplayState({ ...location, hideNameOnPlayerDisplay: true }, 'tavern.webp'),
    ).toEqual({
      mode: 'location',
      locationId: 'tavern',
      name: undefined,
      imagePath: 'tavern.webp',
    });
  });
});
