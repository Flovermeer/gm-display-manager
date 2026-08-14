import { TestBed } from '@angular/core/testing';

import { InMemoryNpcRepository } from '@app/features/npcs/data-access/in-memory-npc.repository';
import { createEmptyNpcSheet, type Npc } from '@app/features/npcs/domain/npc';
import { NpcRepository } from '@app/features/npcs/data-access/npc.repository';
import { NpcService } from '@app/features/npcs/application/npc.service';

describe('NpcService', () => {
  let service: NpcService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NpcService, { provide: NpcRepository, useClass: InMemoryNpcRepository }],
    });
    service = TestBed.inject(NpcService);
  });

  it('creates, updates and deletes campaign NPCs', async () => {
    const created = await service.create('campaign-id', {
      name: 'Syndra Silvane',
      status: 'active',
      summary: 'Commanditaire',
      notes: '',
      sheet: createEmptyNpcSheet(),
    });

    const updated = await service.update(
      created,
      {
        name: 'Syndra Silvane',
        status: 'missing',
        summary: 'Commanditaire',
        notes: 'Introuvable',
        sheet: { ...createEmptyNpcSheet(), armorClass: 14 },
      },
      'campaigns/campaign-id/media/npc-portraits/syndra.webp',
    );

    expect(updated.portraitPath).toBe('campaigns/campaign-id/media/npc-portraits/syndra.webp');
    expect(updated.idleVideoPath).toBeNull();
    await expect(service.list('campaign-id')).resolves.toEqual([updated]);
    await service.delete(updated);
    await expect(service.list('campaign-id')).resolves.toEqual([]);
  });

  it('never mixes NPCs from different campaigns', async () => {
    await service.create('first-campaign', npcInput('Premier PNJ'));
    await service.create('second-campaign', npcInput('Deuxième PNJ'));

    await expect(service.list('first-campaign')).resolves.toMatchObject([
      { campaignId: 'first-campaign', name: 'Premier PNJ' },
    ] satisfies Partial<Npc>[]);
  });
});

function npcInput(name: string) {
  return {
    name,
    status: 'active' as const,
    summary: '',
    notes: '',
    sheet: createEmptyNpcSheet(),
  };
}
