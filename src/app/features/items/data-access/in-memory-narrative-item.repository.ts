/**
 * But
 * Conserve les objets narratifs en mémoire hors de Tauri.
 *
 * Responsabilités
 * - sert au navigateur et aux tests ;
 */

import type { NarrativeItem } from '@app/features/items/domain/narrative-item';
import { NarrativeItemRepository } from '@app/features/items/data-access/narrative-item.repository';

export class InMemoryNarrativeItemRepository extends NarrativeItemRepository {
  private readonly items = new Map<string, NarrativeItem>();

  override listByCampaign(campaignId: string): Promise<readonly NarrativeItem[]> {
    return Promise.resolve(
      [...this.items.values()]
        .filter((item) => item.campaignId === campaignId)
        .sort(
          (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
        ),
    );
  }

  override findById(campaignId: string, id: string): Promise<NarrativeItem | null> {
    const item = this.items.get(id);
    return Promise.resolve(item?.campaignId === campaignId ? item : null);
  }

  override save(item: NarrativeItem): Promise<void> {
    this.items.set(item.id, item);
    return Promise.resolve();
  }

  override delete(campaignId: string, id: string): Promise<void> {
    const item = this.items.get(id);
    if (item?.campaignId === campaignId) this.items.delete(id);
    return Promise.resolve();
  }

  override countUsingConfiguration(
    campaignId: string,
    kind: 'type' | 'rarity',
    id: string,
  ): Promise<number> {
    return Promise.resolve(
      [...this.items.values()].filter(
        (item) =>
          item.campaignId === campaignId &&
          (kind === 'type' ? item.itemTypeId === id : item.itemRarityId === id),
      ).length,
    );
  }
}
