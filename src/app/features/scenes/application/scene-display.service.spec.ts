import { TestBed } from '@angular/core/testing';

import { LocationRepository } from '@app/features/locations/data-access/location.repository';
import { LocationService } from '@app/features/locations/application/location.service';
import { LocationImageGateway } from '@app/features/locations/data-access/location-image.gateway';
import { NarrativeItemService } from '@app/features/items/application/narrative-item.service';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { createNpc } from '@app/features/npcs/domain/npc';
import { ItemImageGateway } from '@app/features/items/data-access/item-image.gateway';
import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';
import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';
import { InMemoryLocationRepository } from '@app/features/locations/data-access/in-memory-location.repository';
import { ActiveSceneService } from '@app/features/scenes/application/active-scene.service';
import type { Scene } from '@app/features/scenes/domain/scene';
import { SceneDisplayService } from '@app/features/scenes/application/scene-display.service';
import { SceneService } from '@app/features/scenes/application/scene.service';

describe('SceneDisplayService', () => {
  const activeScene = { get: vi.fn(), set: vi.fn(), clear: vi.fn() };
  const sceneService = { findById: vi.fn() };
  const imageGateway = { resolveUrl: vi.fn() };
  const mediaGateway = { resolveUrl: async (path: string) => `asset://${path}` };
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
        { provide: NpcPortraitGateway, useValue: mediaGateway },
        { provide: NpcIdleVideoGateway, useValue: mediaGateway },
        { provide: ItemImageGateway, useValue: mediaGateway },
      ],
    });
    service = TestBed.inject(SceneDisplayService);
    locationService = TestBed.inject(LocationService);
  });

  it('builds an image background from the scene location', async () => {
    const location = await locationService.create(
      'campaign-id',
      { name: 'Villa', summary: '', notes: '', parentLocationId: null },
      ['campaigns/campaign-id/media/locations/villa.webp'],
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
    await expect(service.restore('campaign-id')).resolves.toEqual({ mode: 'neutral' });
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
  it('resolves the media of an NPC shown in front of the scene', async () => {
    const npc = createNpc({
      campaignId: 'campaign-id',
      name: 'Mira Vell',
      portraitPath: 'mira.webp',
      idleVideoPath: 'mira.webm',
    });

    await expect(
      service.buildWithNpc(sceneFixture(), { ...npc, portraitPath: 'mira.webp' }),
    ).resolves.toMatchObject({
      foreground: {
        type: 'npc',
        resourceId: npc.id,
        imagePath: 'asset://mira.webp',
        idleVideoPath: 'asset://mira.webm',
      },
    });
  });
});

function sceneFixture(overrides: Partial<Scene> = {}): Scene {
  return {
    id: 'scene-id',
    campaignId: 'campaign-id',
    chapterId: 'chapter-id',
    position: 0,
    name: 'Audience',
    summary: '',
    description: { schemaVersion: 1, content: { type: 'doc' } },
    locationId: null,
    npcIds: [],
    monsterIds: [],
    itemIds: [],
    createdAt: '2026-08-13T08:00:00.000Z',
    updatedAt: '2026-08-13T08:00:00.000Z',
    ...overrides,
  };
}
