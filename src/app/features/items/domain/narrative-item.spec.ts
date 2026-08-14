import { createEmptyRichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import {
  createNarrativeItem,
  updateNarrativeItem,
} from '@app/features/items/domain/narrative-item';

describe('NarrativeItem', () => {
  const input = {
    itemTypeId: 'type-id',
    itemRarityId: 'rarity-id',
    owner: null,
    name: ' Anneau de l’Hiver ',
    status: 'active' as const,
    attunement: 'required' as const,
    attunementCondition: 'ignorée',
    summary: ' Artefact de glace ',
    description: createEmptyRichTextDocument(),
  };

  it('normalizes an item and clears irrelevant attunement conditions', () => {
    const item = createNarrativeItem(
      'campaign-id',
      input,
      null,
      () => 'item-id',
      () => new Date('2026-08-13T08:00:00Z'),
    );
    expect(item).toMatchObject({
      name: 'Anneau de l’Hiver',
      summary: 'Artefact de glace',
      attunementCondition: '',
    });
    const updated = updateNarrativeItem(item, {
      ...input,
      attunement: 'conditional',
      attunementCondition: '  par Artus  ',
    });
    expect(updated.attunementCondition).toBe('par Artus');
  });

  it('requires a conditional attunement rule', () => {
    expect(() =>
      createNarrativeItem('campaign-id', {
        ...input,
        attunement: 'conditional',
        attunementCondition: ' ',
      }),
    ).toThrow();
  });
});
