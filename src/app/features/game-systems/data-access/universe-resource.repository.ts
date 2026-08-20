/**
 * But
 * Définit le port de gestion des ressources canoniques d'un univers.
 *
 * Responsabilités
 * - liste les catalogues sans exposer les états de campagne ;
 * - isole la corbeille globale de la persistance SQLite.
 */

import type {
  UniverseResourceDetail,
  UniverseResourceSummary,
  UniverseResourceType,
} from '@app/features/game-systems/domain/universe-resource';

export abstract class UniverseResourceRepository {
  abstract list(
    universeId: string,
    type: UniverseResourceType,
  ): Promise<readonly UniverseResourceSummary[]>;
  abstract find(
    universeId: string,
    type: UniverseResourceType,
    id: string,
  ): Promise<UniverseResourceDetail | null>;
  abstract save(resource: UniverseResourceDetail): Promise<void>;
  abstract trash(universeId: string, type: UniverseResourceType, id: string): Promise<void>;
  abstract restore(universeId: string, type: UniverseResourceType, id: string): Promise<void>;
}
