/**
 * But
 * Conserve les objets narratifs et leur état de campagne en mémoire.
 *
 * Responsabilités
 * - sert au navigateur et aux tests ;
 * - reproduit imports, snapshots, promotions et état local.
 */

import type {
  ItemOwner,
  NarrativeItem,
  NarrativeItemStatus,
} from '@app/features/items/domain/narrative-item';
import { NarrativeItemRepository } from '@app/features/items/data-access/narrative-item.repository';

type CampaignState = Readonly<{
  owner: ItemOwner | null;
  status: NarrativeItemStatus;
  createdAt: string;
  updatedAt: string;
}>;

export class InMemoryNarrativeItemRepository extends NarrativeItemRepository {
  private readonly items = new Map<string, NarrativeItem>();
  private readonly campaignIds = new Map<string, Set<string>>();
  private readonly states = new Map<string, CampaignState>();
  private readonly overrides = new Map<string, NarrativeItem>();

  override listByCampaign(campaignId: string): Promise<readonly NarrativeItem[]> {
    const ids = this.campaignIds.get(campaignId) ?? new Set<string>();
    return Promise.resolve(
      [...ids]
        .flatMap((id) => {
          const item = this.items.get(id);
          return item ? [this.effective(item, campaignId)] : [];
        })
        .sort(
          (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
        ),
    );
  }

  override listAvailableByCampaign(campaignId: string): Promise<readonly NarrativeItem[]> {
    const selected = this.campaignIds.get(campaignId) ?? new Set<string>();
    return Promise.resolve(
      [...this.items.values()]
        .filter((item) => item.provenance === 'universe' && !selected.has(item.id))
        .map((item) => ({ ...item, campaignId, owner: null, status: 'active' as const })),
    );
  }

  override findById(campaignId: string, id: string): Promise<NarrativeItem | null> {
    const item = this.items.get(id);
    return Promise.resolve(
      item && this.campaignIds.get(campaignId)?.has(id) ? this.effective(item, campaignId) : null,
    );
  }

  override async save(item: NarrativeItem): Promise<void> {
    if (item.provenance === 'campaign') this.items.set(item.id, item);
    else
      this.overrides.set(this.key(item.campaignId, item.id), { ...item, provenance: 'override' });
    await this.saveCampaignState(item);
  }

  override saveCampaignState(item: NarrativeItem): Promise<void> {
    this.associate(item.campaignId, item.id);
    this.states.set(this.key(item.campaignId, item.id), {
      owner: item.owner,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
    return Promise.resolve();
  }

  override delete(campaignId: string, id: string): Promise<void> {
    const item = this.items.get(id);
    if (item?.provenance === 'campaign' && item.campaignId === campaignId) this.items.delete(id);
    this.overrides.delete(this.key(campaignId, id));
    this.states.delete(this.key(campaignId, id));
    this.campaignIds.get(campaignId)?.delete(id);
    return Promise.resolve();
  }

  override attach(campaignId: string, id: string): Promise<void> {
    const item = this.items.get(id);
    if (item?.provenance !== 'universe') return Promise.reject(new Error('Objet indisponible.'));
    this.associate(campaignId, id);
    this.states.set(this.key(campaignId, id), {
      owner: null,
      status: 'active',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
    return Promise.resolve();
  }

  override promote(campaignId: string, id: string): Promise<void> {
    const item = this.items.get(id);
    if (!item || item.provenance !== 'campaign' || item.campaignId !== campaignId) {
      return Promise.reject(new Error('Objet indisponible.'));
    }
    this.items.set(id, { ...item, provenance: 'universe' });
    return Promise.resolve();
  }

  override resetOverride(campaignId: string, id: string): Promise<void> {
    this.overrides.delete(this.key(campaignId, id));
    return Promise.resolve();
  }

  override async countUsingConfiguration(
    _universeId: string,
    kind: 'type' | 'rarity',
    id: string,
  ): Promise<number> {
    const items = [...this.items.values()];
    return items.filter((item) =>
      kind === 'type' ? item.itemTypeId === id : item.itemRarityId === id,
    ).length;
  }

  private associate(campaignId: string, id: string): void {
    const ids = this.campaignIds.get(campaignId) ?? new Set<string>();
    ids.add(id);
    this.campaignIds.set(campaignId, ids);
  }

  private effective(item: NarrativeItem, campaignId: string): NarrativeItem {
    const canonical = this.overrides.get(this.key(campaignId, item.id)) ?? { ...item, campaignId };
    const state = this.states.get(this.key(campaignId, item.id));
    return state ? { ...canonical, ...state } : canonical;
  }

  private key(campaignId: string, id: string): string {
    return `${campaignId}:${id}`;
  }
}
