import { TestBed } from '@angular/core/testing';

import { RecentResourceService } from '@app/features/recent-resources/application/recent-resource.service';
import { RecentResourceStore } from '@app/features/recent-resources/application/recent-resource.store';

describe('RecentResourceStore', () => {
  const service = {
    listAvailable: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  };
  let store: RecentResourceStore;

  beforeEach(() => {
    vi.clearAllMocks();
    service.listAvailable.mockResolvedValue([]);
    service.save.mockResolvedValue(undefined);
    service.remove.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [RecentResourceStore, { provide: RecentResourceService, useValue: service }],
    });
    store = TestBed.inject(RecentResourceStore);
  });

  it('moves a revisited resource to the front without duplicating it', async () => {
    await store.initialize('campaign-id');
    await store.record({ resourceType: 'npc', resourceId: 'npc-id', displayName: 'Syndra' });
    await store.record({
      resourceType: 'location',
      resourceId: 'location-id',
      displayName: 'Port',
    });
    await store.record({ resourceType: 'npc', resourceId: 'npc-id', displayName: 'Syndra' });

    expect(store.resources().map(({ resourceId }) => resourceId)).toEqual([
      'npc-id',
      'location-id',
    ]);
    expect(service.save).toHaveBeenCalledTimes(3);
  });

  it('exposes only the five most recent resources', async () => {
    await store.initialize('campaign-id');
    for (let index = 1; index <= 6; index += 1) {
      await store.record({
        resourceType: 'npc',
        resourceId: `npc-${index}`,
        displayName: `NPC ${index}`,
      });
    }

    expect(store.resources().map(({ resourceId }) => resourceId)).toEqual([
      'npc-6',
      'npc-5',
      'npc-4',
      'npc-3',
      'npc-2',
    ]);
  });

  it('removes an unavailable target immediately', async () => {
    await store.initialize('campaign-id');
    await store.record({ resourceType: 'scene', resourceId: 'scene-id', displayName: 'Audience' });
    await store.remove('scene', 'scene-id');

    expect(store.resources()).toEqual([]);
    expect(service.remove).toHaveBeenCalledWith('campaign-id', 'scene', 'scene-id');
  });

  it('does not propagate persistence failures to the resource workflow', async () => {
    service.remove.mockRejectedValueOnce(new Error('SQLite unavailable'));
    await store.initialize('campaign-id');

    await expect(store.remove('npc', 'npc-id')).resolves.toBeUndefined();
    expect(store.error()).toBe('SQLite unavailable');
  });
});
