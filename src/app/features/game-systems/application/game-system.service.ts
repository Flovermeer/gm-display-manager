/**
 * But
 * Orchestre la configuration globale des systèmes de jeu et univers.
 *
 * Responsabilités
 * - applique les validations et renommages ;
 * - distingue corbeille, restauration et purge définitive.
 */

import { inject, Injectable } from '@angular/core';

import { GameSystemRepository } from '@app/features/game-systems/data-access/game-system.repository';
import {
  createGameSystem,
  createGameUniverse,
  renameGameSystem,
  renameGameUniverse,
  type GameSystem,
  type GameUniverse,
} from '@app/features/game-systems/domain/game-system';

@Injectable({ providedIn: 'root' })
export class GameSystemService {
  private readonly repository = inject(GameSystemRepository);

  listSystems(includeDeleted = false): Promise<readonly GameSystem[]> {
    return this.repository.listSystems(includeDeleted);
  }

  listUniverses(gameSystemId: string, includeDeleted = false): Promise<readonly GameUniverse[]> {
    return this.repository.listUniverses(gameSystemId, includeDeleted);
  }

  findUniverse(id: string): Promise<GameUniverse | null> {
    return this.repository.findUniverse(id);
  }

  async createSystem(name: string): Promise<GameSystem> {
    const item = createGameSystem(name);
    await this.repository.saveSystem(item);
    return item;
  }

  async renameSystem(item: GameSystem, name: string): Promise<GameSystem> {
    const updated = renameGameSystem(item, name);
    await this.repository.saveSystem(updated);
    return updated;
  }

  async createUniverse(gameSystemId: string, name: string): Promise<GameUniverse> {
    const item = createGameUniverse(gameSystemId, name);
    await this.repository.saveUniverse(item);
    return item;
  }

  async renameUniverse(item: GameUniverse, name: string): Promise<GameUniverse> {
    const updated = renameGameUniverse(item, name);
    await this.repository.saveUniverse(updated);
    return updated;
  }

  trashSystem(id: string): Promise<void> {
    return this.repository.setSystemDeletedAt(id, new Date().toISOString());
  }

  restoreSystem(id: string): Promise<void> {
    return this.repository.setSystemDeletedAt(id, null);
  }

  purgeSystem(id: string): Promise<void> {
    return this.repository.purgeSystem(id);
  }

  trashUniverse(id: string): Promise<void> {
    return this.repository.setUniverseDeletedAt(id, new Date().toISOString());
  }

  restoreUniverse(id: string): Promise<void> {
    return this.repository.setUniverseDeletedAt(id, null);
  }

  purgeUniverse(id: string): Promise<void> {
    return this.repository.purgeUniverse(id);
  }
}
