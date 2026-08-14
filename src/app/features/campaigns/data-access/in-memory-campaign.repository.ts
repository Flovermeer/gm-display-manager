/**
 * But
 * Conserve les campagnes en mémoire hors de Tauri.
 *
 * Responsabilités
 * - sert d’adaptateur navigateur et de doublure de test ;
 * - implémente le même contrat que l’adaptateur SQLite ;
 */

import type { Campaign } from '@app/features/campaigns/domain/campaign';
import { CampaignRepository } from '@app/features/campaigns/data-access/campaign.repository';

export class InMemoryCampaignRepository extends CampaignRepository {
  private readonly campaigns = new Map<string, Campaign>();

  override list(): Promise<readonly Campaign[]> {
    return Promise.resolve(
      [...this.campaigns.values()].sort(
        (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
      ),
    );
  }

  override findById(id: string): Promise<Campaign | null> {
    return Promise.resolve(this.campaigns.get(id) ?? null);
  }

  override save(campaign: Campaign): Promise<void> {
    this.campaigns.set(campaign.id, campaign);
    return Promise.resolve();
  }

  override delete(id: string): Promise<void> {
    this.campaigns.delete(id);
    return Promise.resolve();
  }
}
