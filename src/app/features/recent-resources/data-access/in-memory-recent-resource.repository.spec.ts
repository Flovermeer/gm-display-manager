import { InMemoryRecentResourceRepository } from '@app/features/recent-resources/data-access/in-memory-recent-resource.repository';
import type { RecentResource } from '@app/features/recent-resources/domain/recent-resource';

describe('InMemoryRecentResourceRepository', () => {
  it('deduplicates resources and retains only the eight most recent entries', async () => {
    const repository = new InMemoryRecentResourceRepository();
    for (let index = 1; index <= 9; index += 1) {
      await repository.save(resource(`npc-${index}`, index));
    }

    await expect(repository.list('campaign-id')).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ resourceId: 'npc-9' })]),
    );
    expect(await repository.list('campaign-id')).toHaveLength(8);
    expect(
      (await repository.list('campaign-id')).some(({ resourceId }) => resourceId === 'npc-1'),
    ).toBe(false);

    await repository.save(resource('npc-4', 10));
    expect((await repository.list('campaign-id'))[0]?.resourceId).toBe('npc-4');
    expect(
      (await repository.list('campaign-id')).filter(({ resourceId }) => resourceId === 'npc-4'),
    ).toHaveLength(1);
  });
});

function resource(resourceId: string, viewedOrder: number): RecentResource {
  return {
    campaignId: 'campaign-id',
    resourceType: 'npc',
    resourceId,
    displayName: resourceId,
    viewedOrder,
  };
}
