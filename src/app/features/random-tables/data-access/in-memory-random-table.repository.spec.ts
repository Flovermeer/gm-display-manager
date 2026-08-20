import { InMemoryRandomTableRepository } from '@app/features/random-tables/data-access/in-memory-random-table.repository';
import type { RandomTable } from '@app/features/random-tables/domain/random-table';

describe('InMemoryRandomTableRepository', () => {
  it('isolates tables by campaign and deletes the complete aggregate', async () => {
    const repository = new InMemoryRandomTableRepository();
    await repository.save(table);

    await expect(repository.listByCampaign('campaign-id')).resolves.toEqual([table]);
    await expect(repository.listByCampaign('other-campaign')).resolves.toEqual([]);

    await repository.delete('campaign-id', table.id);
    await expect(repository.findById('campaign-id', table.id)).resolves.toBeNull();
  });
});

const table: RandomTable = {
  id: 'table-id',
  campaignId: 'campaign-id',
  name: 'Rencontres',
  description: '',
  entries: [{ id: 'entry-id', minimum: 1, maximum: 1, resultText: 'Voyageurs' }],
  createdAt: '2026-08-20T12:00:00.000Z',
  updatedAt: '2026-08-20T12:00:00.000Z',
};
