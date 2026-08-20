/**
 * But
 * Conserve l'historique récent en mémoire hors de Tauri.
 *
 * Responsabilités
 * - sert d'adaptateur navigateur et de doublure de test ;
 * - reproduit la limite persistante de huit ressources par campagne.
 */

import { RecentResourceRepository } from '@app/features/recent-resources/data-access/recent-resource.repository';
import {
  RECENT_RESOURCE_LIMIT,
  type RecentResource,
  type RecentResourceType,
} from '@app/features/recent-resources/domain/recent-resource';

export class InMemoryRecentResourceRepository extends RecentResourceRepository {
  private readonly resources = new Map<string, readonly RecentResource[]>();

  override list(campaignId: string): Promise<readonly RecentResource[]> {
    return Promise.resolve(this.resources.get(campaignId) ?? []);
  }

  override save(resource: RecentResource): Promise<void> {
    const current = this.resources.get(resource.campaignId) ?? [];
    this.resources.set(
      resource.campaignId,
      [
        resource,
        ...current.filter(
          (candidate) =>
            candidate.resourceType !== resource.resourceType ||
            candidate.resourceId !== resource.resourceId,
        ),
      ]
        .sort((left, right) => right.viewedOrder - left.viewedOrder)
        .slice(0, RECENT_RESOURCE_LIMIT),
    );
    return Promise.resolve();
  }

  override remove(
    campaignId: string,
    resourceType: RecentResourceType,
    resourceId: string,
  ): Promise<void> {
    const current = this.resources.get(campaignId) ?? [];
    this.resources.set(
      campaignId,
      current.filter(
        (candidate) =>
          candidate.resourceType !== resourceType || candidate.resourceId !== resourceId,
      ),
    );
    return Promise.resolve();
  }
}
