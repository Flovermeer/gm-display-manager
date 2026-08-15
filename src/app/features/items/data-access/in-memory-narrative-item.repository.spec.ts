import { InMemoryNarrativeItemRepository } from '@app/features/items/data-access/in-memory-narrative-item.repository';
import type { NarrativeItem } from '@app/features/items/domain/narrative-item';
import { createEmptyRichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';

describe('InMemoryNarrativeItemRepository sharing', () => {
  it('keeps campaign state while resetting a canonical sheet override', async () => {
    const repository = new InMemoryNarrativeItemRepository();
    await repository.save(item);
    await repository.promote(item.campaignId, item.id);
    const canonical = (await repository.listByCampaign(item.campaignId))[0]!;
    await repository.save({
      ...canonical,
      name: 'Anneau adapté',
      status: 'lost',
      owner: { resourceType: 'npc', resourceId: 'npc-id' },
    });

    await expect(repository.listByCampaign(item.campaignId)).resolves.toContainEqual(
      expect.objectContaining({
        name: 'Anneau adapté',
        status: 'lost',
        provenance: 'override',
      }),
    );

    await repository.resetOverride(item.campaignId, item.id);
    await expect(repository.listByCampaign(item.campaignId)).resolves.toContainEqual(
      expect.objectContaining({
        name: "Anneau de l'Hiver",
        status: 'lost',
        owner: { resourceType: 'npc', resourceId: 'npc-id' },
        provenance: 'universe',
      }),
    );
  });

  it('imports a canonical item with fresh campaign state', async () => {
    const repository = new InMemoryNarrativeItemRepository();
    await repository.save(item);
    await repository.promote(item.campaignId, item.id);

    await repository.attach('second-campaign', item.id);

    await expect(repository.listByCampaign('second-campaign')).resolves.toContainEqual(
      expect.objectContaining({ owner: null, status: 'active', provenance: 'universe' }),
    );
  });
});

const item: NarrativeItem = {
  id: 'item-id',
  campaignId: 'campaign-id',
  provenance: 'campaign',
  itemTypeId: 'type-id',
  itemRarityId: null,
  owner: null,
  name: "Anneau de l'Hiver",
  status: 'active',
  attunement: 'required',
  attunementCondition: '',
  summary: '',
  description: createEmptyRichTextDocument(),
  imagePath: null,
  createdAt: '2026-08-15T12:00:00.000Z',
  updatedAt: '2026-08-15T12:00:00.000Z',
};
