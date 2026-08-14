/**
 * But
 * Conserve le bestiaire en mémoire hors de Tauri.
 *
 * Responsabilités
 * - sert d’adaptateur navigateur et de doublure de test ;
 * - reproduit la sélection explicite par campagne.
 */

import { MonsterRepository } from '@app/features/bestiary/data-access/monster.repository';
import type { Monster } from '@app/features/bestiary/domain/monster';

export class InMemoryMonsterRepository extends MonsterRepository {
  private readonly monsters = new Map<string, Monster>();
  private readonly campaignIds = new Map<string, Set<string>>();

  override listByCampaign(campaignId: string): Promise<readonly Monster[]> {
    const ids = this.campaignIds.get(campaignId) ?? new Set();
    return Promise.resolve(
      sort(
        [...ids].flatMap((id) => {
          const monster = this.monsters.get(id);
          return monster ? [{ ...monster, campaignId }] : [];
        }),
      ),
    );
  }

  override listAvailableByCampaign(campaignId: string): Promise<readonly Monster[]> {
    const selected = this.campaignIds.get(campaignId) ?? new Set();
    return Promise.resolve(
      sort(
        [...this.monsters.values()]
          .filter((monster) => !selected.has(monster.id))
          .map((monster) => ({ ...monster, campaignId })),
      ),
    );
  }

  override async findById(campaignId: string, id: string): Promise<Monster | null> {
    const monster = this.monsters.get(id);
    return this.campaignIds.get(campaignId)?.has(id) && monster ? { ...monster, campaignId } : null;
  }

  override async save(monster: Monster): Promise<void> {
    this.monsters.set(monster.id, monster);
    await this.attach(monster.campaignId, monster.id);
  }

  override attach(campaignId: string, monsterId: string): Promise<void> {
    const ids = this.campaignIds.get(campaignId) ?? new Set<string>();
    ids.add(monsterId);
    this.campaignIds.set(campaignId, ids);
    return Promise.resolve();
  }

  override detach(campaignId: string, monsterId: string): Promise<void> {
    this.campaignIds.get(campaignId)?.delete(monsterId);
    return Promise.resolve();
  }
}

function sort(values: Monster[]): readonly Monster[] {
  return values.sort(
    (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
  );
}
