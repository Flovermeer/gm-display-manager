import { TestBed } from '@angular/core/testing';

import { AppSettingRepository } from '@app/core/persistence/app-setting.repository';
import { InMemoryAppSettingRepository } from '@app/core/persistence/in-memory-app-setting.repository';
import { PlayerDisplayStore } from '@app/features/display/application/player-display.store';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import { NarrativeItemService } from '@app/features/items/application/narrative-item.service';
import { NarrativeItemWorkspaceFacade } from '@app/features/items/application/narrative-item-workspace.facade';
import { ItemImageGateway } from '@app/features/items/data-access/item-image.gateway';
import {
  createNarrativeItem,
  DEMO_ITEM_IMAGE_URL,
  emptyNarrativeItemInput,
  type NarrativeItem,
} from '@app/features/items/domain/narrative-item';

describe('NarrativeItemWorkspaceFacade', () => {
  const images = { chooseAndImport: vi.fn(), resolveUrl: vi.fn(), discard: vi.fn() };
  const items = { create: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const displayGateway = {
    isDesktop: true,
    isPlayerDisplayOpen: vi.fn(),
    sendPlayerDisplayState: vi.fn(),
  };
  const input = {
    ...emptyNarrativeItemInput(),
    name: 'Anneau de l’Hiver',
    itemTypeId: 'type-id',
    itemRarityId: 'rarity-id',
  };
  let facade: NarrativeItemWorkspaceFacade;
  let store: PlayerDisplayStore;

  function item(overrides: Partial<NarrativeItem> = {}): NarrativeItem {
    return { ...createNarrativeItem('campaign-id', input, 'ring.webp'), ...overrides };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    images.resolveUrl.mockImplementation(async (path: string) => `asset://${path}`);
    images.discard.mockResolvedValue(undefined);
    items.delete.mockResolvedValue(undefined);
    displayGateway.sendPlayerDisplayState.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: NarrativeItemService, useValue: items },
        { provide: AppSettingRepository, useClass: InMemoryAppSettingRepository },
        { provide: ItemImageGateway, useValue: images },
        { provide: DisplayGateway, useValue: displayGateway },
      ],
    });
    facade = TestBed.inject(NarrativeItemWorkspaceFacade);
    store = TestBed.inject(PlayerDisplayStore);
  });

  it('uses the demo image for an item without image', async () => {
    await expect(facade.imageUrl(null)).resolves.toBe(DEMO_ITEM_IMAGE_URL);
    await expect(facade.imageUrl('ring.webp')).resolves.toBe('asset://ring.webp');
  });

  it('removes only the replaced image owned by the campaign', async () => {
    const existing = item({ provenance: 'campaign' });
    items.update.mockResolvedValue({ ...existing, imagePath: 'new-ring.webp' });

    const saved = await facade.save({
      campaignId: 'campaign-id',
      existing,
      input,
      imagePath: 'new-ring.webp',
    });
    expect(images.discard).toHaveBeenCalledWith('ring.webp');
    expect(saved.cleanupErrors).toEqual([]);

    images.discard.mockClear();
    const canonical = item({ provenance: 'universe' });
    items.update.mockResolvedValue({ ...canonical, imagePath: 'new-ring.webp' });
    await facade.save({ campaignId: 'campaign-id', existing: canonical, input, imagePath: null });
    expect(images.discard).not.toHaveBeenCalled();
  });

  it('toggles the item on the player display', async () => {
    const ring = item();

    await facade.toggleOnPlayerDisplay(ring, 'ring.webp');
    expect(store.state()).toMatchObject({
      mode: 'item',
      itemId: ring.id,
      imagePath: 'asset://ring.webp',
    });

    await facade.toggleOnPlayerDisplay(ring, 'ring.webp');
    expect(store.state()).toEqual({ mode: 'neutral' });
  });

  it('deletes a displayed campaign item and reports image cleanup errors', async () => {
    const ring = item({ provenance: 'campaign' });
    store.setState({
      mode: 'item',
      itemId: ring.id,
      name: ring.name,
      imagePath: 'asset://ring.webp',
    });
    images.discard.mockRejectedValue(new Error('image verrouillée'));

    const errors = await facade.delete(ring, true);

    expect(store.state()).toEqual({ mode: 'neutral' });
    expect(items.delete).toHaveBeenCalledWith(ring);
    expect(errors).toEqual([new Error('image verrouillée')]);
  });
});
