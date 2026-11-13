import { TestBed } from '@angular/core/testing';

import { AppSettingRepository } from '@app/core/persistence/app-setting.repository';
import { InMemoryAppSettingRepository } from '@app/core/persistence/in-memory-app-setting.repository';
import { PlayerDisplayStore } from '@app/features/display/application/player-display.store';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import { LocationService } from '@app/features/locations/application/location.service';
import { LocationWorkspaceFacade } from '@app/features/locations/application/location-workspace.facade';
import { InMemoryLocationRepository } from '@app/features/locations/data-access/in-memory-location.repository';
import { LocationImageGateway } from '@app/features/locations/data-access/location-image.gateway';
import { LocationRepository } from '@app/features/locations/data-access/location.repository';
import {
  DEMO_LOCATION_IMAGE_URL,
  type UpdateLocationInput,
} from '@app/features/locations/domain/location';
import { createEmptyRichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';

describe('LocationWorkspaceFacade', () => {
  const input: UpdateLocationInput = {
    name: 'Crypte oubliée',
    parentLocationId: null,
    summary: '',
    notes: '',
    description: createEmptyRichTextDocument(),
    hideNameOnPlayerDisplay: false,
  };
  const images = { chooseAndImport: vi.fn(), resolveUrl: vi.fn(), discard: vi.fn() };
  const displayGateway = {
    isDesktop: true,
    isPlayerDisplayOpen: vi.fn(),
    sendPlayerDisplayState: vi.fn(),
  };
  let facade: LocationWorkspaceFacade;
  let store: PlayerDisplayStore;

  beforeEach(() => {
    vi.clearAllMocks();
    images.resolveUrl.mockImplementation(async (path: string) => `asset://${path}`);
    images.discard.mockResolvedValue(undefined);
    displayGateway.sendPlayerDisplayState.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: LocationRepository, useClass: InMemoryLocationRepository },
        { provide: AppSettingRepository, useClass: InMemoryAppSettingRepository },
        { provide: LocationImageGateway, useValue: images },
        { provide: DisplayGateway, useValue: displayGateway },
      ],
    });
    facade = TestBed.inject(LocationWorkspaceFacade);
    store = TestBed.inject(PlayerDisplayStore);
  });

  function create(imagePaths: readonly string[]) {
    return facade.save({
      campaignId: 'campaign-id',
      existing: null,
      input,
      imagePaths,
      selectedImagePath: null,
      isPlayerDisplayOpen: false,
    });
  }

  it('imports images with their preview urls', async () => {
    images.chooseAndImport.mockResolvedValue(['crypt.webp', 'altar.webp']);

    await expect(facade.importImages('universe-id')).resolves.toEqual({
      paths: ['crypt.webp', 'altar.webp'],
      urls: ['asset://crypt.webp', 'asset://altar.webp'],
    });
  });

  it('discards gallery images removed at save time and hides the name if requested', async () => {
    const { location } = await create(['crypt.webp', 'altar.webp']);
    store.setState({
      mode: 'location',
      locationId: location.id,
      name: 'Crypte oubliée',
      imagePath: 'asset://crypt.webp',
    });

    const saved = await facade.save({
      campaignId: 'campaign-id',
      existing: location,
      input: { ...input, hideNameOnPlayerDisplay: true },
      imagePaths: ['crypt.webp'],
      selectedImagePath: 'crypt.webp',
      isPlayerDisplayOpen: true,
    });

    expect(images.discard).toHaveBeenCalledWith('altar.webp');
    expect(saved.cleanupErrors).toEqual([]);
    expect(displayGateway.sendPlayerDisplayState).toHaveBeenLastCalledWith({
      mode: 'location',
      locationId: location.id,
      name: undefined,
      imagePath: 'asset://crypt.webp',
    });
  });

  it('withdraws only the gallery image currently shown', async () => {
    const { location } = await create(['crypt.webp']);
    store.setState({
      mode: 'location',
      locationId: location.id,
      imagePath: 'asset://crypt.webp',
    });

    await facade.withdrawImage(location.id, 'asset://other.webp', true);
    expect(store.state().mode).toBe('location');

    await facade.withdrawImage(location.id, 'asset://crypt.webp', true);
    expect(store.state()).toEqual({ mode: 'neutral' });
  });

  it('deletes a campaign location with its images and reports cleanup errors', async () => {
    const { location } = await create(['crypt.webp', 'altar.webp']);
    images.discard.mockRejectedValueOnce(new Error('image verrouillée'));

    const errors = await facade.delete(location, false);

    await expect(TestBed.inject(LocationService).list('campaign-id')).resolves.toEqual([]);
    expect(images.discard).toHaveBeenCalledTimes(2);
    expect(errors).toEqual([new Error('image verrouillée')]);
  });

  it('shows the demo image for a location without gallery', async () => {
    const { location } = await create([]);

    await facade.toggleOnPlayerDisplay(location, DEMO_LOCATION_IMAGE_URL);

    expect(store.state()).toMatchObject({ mode: 'location', imagePath: DEMO_LOCATION_IMAGE_URL });
  });
});
