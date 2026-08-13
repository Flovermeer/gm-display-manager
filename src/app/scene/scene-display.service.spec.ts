import { TestBed } from '@angular/core/testing';

import { LocationRepository } from '../location/location.repository';
import { LocationService } from '../location/location.service';
import { LocationImageGateway } from '../media/location-image.gateway';
import { NarrativeItemService } from '../narrative-item/narrative-item.service';
import { NpcService } from '../npc/npc.service';
import { InMemoryLocationRepository } from '../persistence/in-memory-location.repository';
import { ActiveSceneService } from './active-scene.service';
import type { Scene } from './scene';
import { SceneDisplayService } from './scene-display.service';
import { SceneService } from './scene.service';

describe('SceneDisplayService', () => {
  const activeScene = { get: vi.fn(), set: vi.fn(), clear: vi.fn() };
  const sceneService = { findById: vi.fn() };
  const imageGateway = { resolveUrl: vi.fn() };
  let service: SceneDisplayService;
  let locationService: LocationService;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        SceneDisplayService,
        LocationService,
        { provide: LocationRepository, useClass: InMemoryLocationRepository },
        { provide: LocationImageGateway, useValue: imageGateway },
        { provide: ActiveSceneService, useValue: activeScene },
        { provide: SceneService, useValue: sceneService },
        { provide: NpcService, useValue: { list: () => Promise.resolve([]) } },
        { provide: NarrativeItemService, useValue: { list: () => Promise.resolve([]) } },
      ],
    });
    service = TestBed.inject(SceneDisplayService);
    locationService = TestBed.inject(LocationService);
  });

  it('builds an image background from the scene location', async () => {
    const location = await locationService.create(
      'campaign-id',
      { name: 'Villa', summary: '', notes: '', parentLocationId: null },
      'campaigns/campaign-id/media/locations/villa.webp',
    );
    imageGateway.resolveUrl.mockResolvedValue('asset://villa.webp');
    const scene = sceneFixture({ locationId: location.id });
    await expect(service.build(scene)).resolves.toMatchObject({
      mode: 'scene',
      sceneId: scene.id,
      background: { type: 'image', imagePath: 'asset://villa.webp', name: 'Villa' },
      foreground: undefined,
    });
  });

  it('restores the active scene without foreground and clears a broken preference', async () => {
    const scene = sceneFixture();
    activeScene.get.mockResolvedValueOnce(scene.id).mockResolvedValueOnce('missing-scene');
    sceneService.findById.mockResolvedValueOnce(scene).mockResolvedValueOnce(null);
    await expect(service.restore('campaign-id')).resolves.toMatchObject({
      mode: 'scene',
      sceneId: scene.id,
      background: { type: 'default' },
      foreground: undefined,
    });
    await expect(service.restore('campaign-id')).resolves.toEqual({
      mode: 'scene',
      sceneId: null,
      background: { type: 'default' },
    });
    expect(activeScene.clear).toHaveBeenCalledWith('campaign-id');
  });

  it('persists activation only after the display state can be built', async () => {
    const scene = sceneFixture({ locationId: 'missing-location' });
    await expect(service.activate(scene)).resolves.toMatchObject({
      mode: 'scene',
      background: { type: 'default' },
    });
    expect(activeScene.set).toHaveBeenCalledWith('campaign-id', 'scene-id');
  });
});

function sceneFixture(overrides: Partial<Scene> = {}): Scene {
  return {
    id: 'scene-id',
    campaignId: 'campaign-id',
    name: 'Audience',
    summary: '',
    locationId: null,
    npcIds: [],
    itemIds: [],
    createdAt: '2026-08-13T08:00:00.000Z',
    updatedAt: '2026-08-13T08:00:00.000Z',
    ...overrides,
  };
}
