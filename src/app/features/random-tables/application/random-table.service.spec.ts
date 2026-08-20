import { TestBed } from '@angular/core/testing';

import { RandomTableService } from '@app/features/random-tables/application/random-table.service';
import { InMemoryRandomTableRepository } from '@app/features/random-tables/data-access/in-memory-random-table.repository';
import { RandomTableRepository } from '@app/features/random-tables/data-access/random-table.repository';

describe('RandomTableService', () => {
  let service: RandomTableService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RandomTableService,
        { provide: RandomTableRepository, useClass: InMemoryRandomTableRepository },
      ],
    });
    service = TestBed.inject(RandomTableService);
  });

  it('creates, updates and deletes a table as one aggregate', async () => {
    const created = await service.create('campaign-id', {
      name: 'Rencontres',
      description: '',
      entries: [],
    });
    const updated = await service.update(created, {
      name: 'Rencontres en jungle',
      description: '',
      entries: [{ minimum: 1, maximum: 1, resultText: 'Gobelins' }],
    });

    await expect(service.list('campaign-id')).resolves.toEqual([updated]);
    await service.delete(updated);
    await expect(service.list('campaign-id')).resolves.toEqual([]);
  });
});
