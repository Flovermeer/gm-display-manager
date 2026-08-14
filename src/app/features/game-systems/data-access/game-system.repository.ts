/**
 * But
 * Définit le port de persistance des systèmes de jeu et de leurs univers.
 *
 * Responsabilités
 * - expose les catalogues actifs et la corbeille ;
 * - sépare la suppression réversible de la purge définitive.
 */

import type { GameSystem, GameUniverse } from '@app/features/game-systems/domain/game-system';

export abstract class GameSystemRepository {
  abstract listSystems(includeDeleted?: boolean): Promise<readonly GameSystem[]>;
  abstract saveSystem(gameSystem: GameSystem): Promise<void>;
  abstract setSystemDeletedAt(id: string, deletedAt: string | null): Promise<void>;
  abstract purgeSystem(id: string): Promise<void>;

  abstract listUniverses(
    gameSystemId: string,
    includeDeleted?: boolean,
  ): Promise<readonly GameUniverse[]>;
  abstract findUniverse(id: string): Promise<GameUniverse | null>;
  abstract saveUniverse(universe: GameUniverse): Promise<void>;
  abstract setUniverseDeletedAt(id: string, deletedAt: string | null): Promise<void>;
  abstract purgeUniverse(id: string): Promise<void>;
}
