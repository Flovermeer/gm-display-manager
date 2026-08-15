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
  UniverseResourceSummary,
  UniverseResourceType,
} from '@app/features/game-systems/domain/universe-resource';

export class InMemoryUniverseResourceRepository extends UniverseResourceRepository {
  private readonly resources = new Map<string, UniverseResourceSummary>();

  override list(
    universeId: string,
    type: UniverseResourceType,
  ): Promise<readonly UniverseResourceSummary[]> {
    return Promise.resolve(
      [...this.resources.values()]
        .filter((resource) => resource.universeId === universeId && resource.type === type)
        .sort((left, right) => left.name.localeCompare(right.name)),
    );
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
