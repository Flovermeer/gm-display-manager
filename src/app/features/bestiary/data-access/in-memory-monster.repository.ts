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
  private readonly overrides = new Map<string, Monster>();

  override listByCampaign(campaignId: string): Promise<readonly Monster[]> {
    const ids = this.campaignIds.get(campaignId) ?? new Set();
    return Promise.resolve(
      sort(
        [...ids].flatMap((id) => {
          const monster = this.monsters.get(id);
          return monster ? [this.effective(monster, campaignId)] : [];
        }),
      ),
    );
  }

  override listAvailableByCampaign(campaignId: string): Promise<readonly Monster[]> {
    const selected = this.campaignIds.get(campaignId) ?? new Set();
    return Promise.resolve(
      sort(
        [...this.monsters.values()]
          .filter((monster) => monster.provenance === 'universe' && !selected.has(monster.id))
          .map((monster) => ({ ...monster, campaignId })),
      ),
    );
  }

  override async findById(campaignId: string, id: string): Promise<Monster | null> {
    const monster = this.monsters.get(id);
    return this.campaignIds.get(campaignId)?.has(id) && monster
      ? this.effective(monster, campaignId)
      : null;
  }

  override async save(monster: Monster): Promise<void> {
    if (monster.provenance === 'campaign') this.monsters.set(monster.id, monster);
    else this.overrides.set(this.overrideKey(monster.campaignId, monster.id), { ...monster, provenance: 'override' });
    await this.attach(monster.campaignId, monster.id);
  }

  override attach(campaignId: string, monsterId: string): Promise<void> {
    const ids = this.campaignIds.get(campaignId) ?? new Set<string>();
    ids.add(monsterId);
    this.campaignIds.set(campaignId, ids);
    return Promise.resolve();
  }

  override detach(campaignId: string, monsterId: string): Promise<void> {
    const monster = this.monsters.get(monsterId);
    if (monster?.provenance === 'campaign' && monster.campaignId === campaignId) {
      this.monsters.delete(monsterId);
    }
    this.overrides.delete(this.overrideKey(campaignId, monsterId));
    this.campaignIds.get(campaignId)?.delete(monsterId);
    return Promise.resolve();
  }

  override promote(campaignId: string, monsterId: string): Promise<void> {
    const monster = this.monsters.get(monsterId);
    if (!monster || monster.provenance !== 'campaign' || monster.campaignId !== campaignId) {
      return Promise.reject(new Error('Seule une fiche locale peut être enregistrée dans l’univers.'));
    }
    this.monsters.set(monsterId, { ...monster, provenance: 'universe' });
    return Promise.resolve();
  }

  override resetOverride(campaignId: string, monsterId: string): Promise<void> {
    this.overrides.delete(this.overrideKey(campaignId, monsterId));
    return Promise.resolve();
  }

  private effective(monster: Monster, campaignId: string): Monster {
    return this.overrides.get(this.overrideKey(campaignId, monster.id)) ?? { ...monster, campaignId };
  }

  private overrideKey(campaignId: string, monsterId: string): string {
    return `${campaignId}:${monsterId}`;
  }
}

function sort(values: Monster[]): readonly Monster[] {
  return values.sort(
    (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
  );
}
