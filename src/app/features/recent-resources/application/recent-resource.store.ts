/**
 * But
 * Porte l'état réactif de l'historique récent pour le layout de campagne.
 *
 * Responsabilités
 * - expose au maximum huit ressources de la plus récente à la plus ancienne ;
 * - sérialise les consultations et suppressions afin de préserver leur ordre.
 */

import { inject, Injectable, signal } from '@angular/core';

import { RecentResourceService } from '@app/features/recent-resources/application/recent-resource.service';
import {
  RECENT_RESOURCE_LIMIT,
  type RecentResource,
  type RecentResourceTarget,
  type RecentResourceType,
} from '@app/features/recent-resources/domain/recent-resource';

@Injectable()
export class RecentResourceStore {
  private readonly service = inject(RecentResourceService);
  private campaignId: string | null = null;
  private nextOrder = 0;
  private ready: Promise<void> = Promise.resolve();
  private writeQueue: Promise<void> = Promise.resolve();

  readonly resources = signal<readonly RecentResource[]>([]);
  readonly error = signal<string | null>(null);

  initialize(campaignId: string): Promise<void> {
    this.campaignId = campaignId;
    this.ready = this.service
      .listAvailable(campaignId)
      .then((resources) => {
        if (this.campaignId !== campaignId) return;
        this.resources.set(resources);
        this.nextOrder = Math.max(0, ...resources.map(({ viewedOrder }) => viewedOrder));
      })
      .catch((error: unknown) => this.error.set(errorMessage(error)));
    return this.ready;
  }

  record(target: RecentResourceTarget): Promise<void> {
    const operation = this.writeQueue.then(async () => {
      await this.ready;
      const campaignId = this.campaignId;
      if (!campaignId) return;
      const displayName = target.displayName.trim();
      if (!displayName) return;

      const first = this.resources()[0];
      if (
        first?.resourceType === target.resourceType &&
        first.resourceId === target.resourceId &&
        first.displayName === displayName
      ) {
        return;
      }

      const resource: RecentResource = {
        campaignId,
        resourceType: target.resourceType,
        resourceId: target.resourceId,
        displayName,
        viewedOrder: ++this.nextOrder,
      };
      this.resources.update((resources) =>
        [
          resource,
          ...resources.filter(
            (candidate) =>
              candidate.resourceType !== resource.resourceType ||
              candidate.resourceId !== resource.resourceId,
          ),
        ].slice(0, RECENT_RESOURCE_LIMIT),
      );
      await this.service.save(resource);
      this.error.set(null);
    });
    this.writeQueue = operation.catch((error: unknown) => this.error.set(errorMessage(error)));
    return this.writeQueue;
  }

  remove(resourceType: RecentResourceType, resourceId: string): Promise<void> {
    const operation = this.writeQueue.then(async () => {
      await this.ready;
      const campaignId = this.campaignId;
      if (!campaignId) return;
      this.resources.update((resources) =>
        resources.filter(
          (candidate) =>
            candidate.resourceType !== resourceType || candidate.resourceId !== resourceId,
        ),
      );
      await this.service.remove(campaignId, resourceType, resourceId);
      this.error.set(null);
    });
    this.writeQueue = operation.catch((error: unknown) => this.error.set(errorMessage(error)));
    return this.writeQueue;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Impossible de mettre à jour l'historique récent.";
}
