/**
 * But
 * Fournit une doublure en mémoire du catalogue global.
 *
 * Responsabilités
 * - respecte le contrat de lecture et de corbeille ;
 * - permet des tests sans SQLite.
 */

import { UniverseResourceRepository } from '@app/features/game-systems/data-access/universe-resource.repository';
import type {
  UniverseResourceDetail,
  UniverseResourceSummary,
  UniverseResourceType,
} from '@app/features/game-systems/domain/universe-resource';

export class InMemoryUniverseResourceRepository extends UniverseResourceRepository {
  private readonly resources = new Map<string, UniverseResourceDetail>();

  override list(
    universeId: string,
    type: UniverseResourceType,
  ): Promise<readonly UniverseResourceSummary[]> {
    return Promise.resolve(
      [...this.resources.values()]
        .filter((resource) => resource.universeId === universeId && resource.type === type)
        .map(summary)
        .sort((left, right) => left.name.localeCompare(right.name)),
    );
  }

  override find(
    universeId: string,
    type: UniverseResourceType,
    id: string,
  ): Promise<UniverseResourceDetail | null> {
    const resource = this.resources.get(`${type}:${id}`);
    return Promise.resolve(resource?.universeId === universeId ? resource : null);
  }

  override save(resource: UniverseResourceDetail): Promise<void> {
    const key = `${resource.type}:${resource.id}`;
    const existing = this.resources.get(key);
    if (existing && existing.universeId !== resource.universeId) {
      return Promise.reject(new Error('Cette ressource appartient à un autre univers.'));
    }
    this.resources.set(key, resource);
    return Promise.resolve();
  }

  override trash(universeId: string, type: UniverseResourceType, id: string): Promise<void> {
    return this.update(universeId, type, id, new Date().toISOString());
  }

  override restore(universeId: string, type: UniverseResourceType, id: string): Promise<void> {
    return this.update(universeId, type, id, null);
  }

  private update(
    universeId: string,
    type: UniverseResourceType,
    id: string,
    deletedAt: string | null,
  ): Promise<void> {
    const key = `${type}:${id}`;
    const resource = this.resources.get(key);
    if (!resource || resource.universeId !== universeId) {
      return Promise.reject(new Error('Ressource canonique introuvable.'));
    }
    this.resources.set(key, { ...resource, deletedAt });
    return Promise.resolve();
  }
}

function summary(resource: UniverseResourceDetail): UniverseResourceSummary {
  return {
    id: resource.id,
    universeId: resource.universeId,
    type: resource.type,
    name: resource.name,
    summary:
      resource.type === 'location' || resource.type === 'item'
        ? resource.summary
        : resource.type === 'player-character'
          ? [resource.sheet.species, resource.sheet.className].filter(Boolean).join(' ')
          : resource.sheet.creatureType,
    campaignCount: 0,
    deletedAt: resource.deletedAt,
  };
}
