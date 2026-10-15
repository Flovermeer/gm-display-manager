/**
 * But
 * Fournit le catalogue systèmes/univers hors de Tauri.
 *
 * Responsabilités
 * - sert d’adaptateur navigateur et de doublure de test ;
 * - conserve les mêmes règles de corbeille que SQLite.
 */

import { GameSystemRepository } from '@app/features/game-systems/data-access/game-system.repository';
import type { GameSystem, GameUniverse } from '@app/features/game-systems/domain/game-system';

const timestamp = '2026-01-01T00:00:00.000Z';

export class InMemoryGameSystemRepository extends GameSystemRepository {
  private readonly systems = new Map<string, GameSystem>([
    [
      'dnd5e',
      {
        id: 'dnd5e',
        name: 'Dungeons & Dragons 5e',
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  ]);
  private readonly universes = new Map<string, GameUniverse>([
    [
      'dnd5e:generic',
      {
        id: 'dnd5e:generic',
        gameSystemId: 'dnd5e',
        name: 'Dungeons & Dragons 5e (générique)',
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    [
      'forgotten-realms',
      {
        id: 'forgotten-realms',
        gameSystemId: 'dnd5e',
        name: 'Forgotten Realms',
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  ]);

  override listSystems(includeDeleted = false): Promise<readonly GameSystem[]> {
    return Promise.resolve(
      sort([...this.systems.values()].filter((item) => includeDeleted || !item.deletedAt)),
    );
  }

  override saveSystem(gameSystem: GameSystem): Promise<void> {
    this.systems.set(gameSystem.id, gameSystem);
    return Promise.resolve();
  }

  override setSystemDeletedAt(id: string, deletedAt: string | null): Promise<void> {
    const item = this.systems.get(id);
    if (item) this.systems.set(id, { ...item, deletedAt });
    return Promise.resolve();
  }

  override purgeSystem(id: string): Promise<void> {
    if (this.systems.get(id)?.deletedAt) {
      this.systems.delete(id);
      for (const [universeId, universe] of this.universes) {
        if (universe.gameSystemId === id) this.universes.delete(universeId);
      }
    }
    return Promise.resolve();
  }

  override listUniverses(
    gameSystemId: string,
    includeDeleted = false,
  ): Promise<readonly GameUniverse[]> {
    return Promise.resolve(
      sort(
        [...this.universes.values()].filter(
          (item) => item.gameSystemId === gameSystemId && (includeDeleted || !item.deletedAt),
        ),
      ),
    );
  }

  override findUniverse(id: string): Promise<GameUniverse | null> {
    return Promise.resolve(this.universes.get(id) ?? null);
  }

  override saveUniverse(universe: GameUniverse): Promise<void> {
    this.universes.set(universe.id, universe);
    return Promise.resolve();
  }

  override setUniverseDeletedAt(id: string, deletedAt: string | null): Promise<void> {
    const item = this.universes.get(id);
    if (item) this.universes.set(id, { ...item, deletedAt });
    return Promise.resolve();
  }

  override purgeUniverse(id: string): Promise<void> {
    if (this.universes.get(id)?.deletedAt) this.universes.delete(id);
    return Promise.resolve();
  }
}

function sort<T extends { name: string; id: string }>(values: T[]): readonly T[] {
  return values.sort(
    (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
  );
}
