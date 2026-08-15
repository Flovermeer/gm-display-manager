/**
 * But
 * Orchestre la gestion des ressources canoniques d'un univers.
 *
 * Responsabilités
 * - expose les catalogues à la configuration globale ;
 * - coordonne les transitions vers et depuis la corbeille.
 */

import { inject, Injectable } from '@angular/core';

import { UniverseResourceRepository } from '@app/features/game-systems/data-access/universe-resource.repository';
import type {
  UniverseResourceSummary,
  UniverseResourceType,
} from '@app/features/game-systems/domain/universe-resource';

@Injectable({ providedIn: 'root' })
export class UniverseResourceService {
  private readonly repository = inject(UniverseResourceRepository);

  list(
    universeId: string,
    type: UniverseResourceType,
  ): Promise<readonly UniverseResourceSummary[]> {
    return this.repository.list(universeId, type);
  }

  trash(resource: UniverseResourceSummary): Promise<void> {
    return this.repository.trash(resource.universeId, resource.type, resource.id);
  }

  restore(resource: UniverseResourceSummary): Promise<void> {
    return this.repository.restore(resource.universeId, resource.type, resource.id);
  }
}
