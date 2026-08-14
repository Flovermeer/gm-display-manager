/**
 * But
 * Orchestre le bestiaire partagé et sa sélection par campagne.
 *
 * Responsabilités
 * - crée et met à jour la fiche canonique ;
 * - attache ou retire explicitement une fiche d’une campagne.
 */

import { inject, Injectable } from '@angular/core';

import { MonsterRepository } from '@app/features/bestiary/data-access/monster.repository';
import {
  createMonster,
  updateMonster,
  type Monster,
  type UpdateMonsterInput,
} from '@app/features/bestiary/domain/monster';

@Injectable({ providedIn: 'root' })
export class MonsterService {
  private readonly repository = inject(MonsterRepository);

  list(campaignId: string): Promise<readonly Monster[]> {
    return this.repository.listByCampaign(campaignId);
  }

  listAvailable(campaignId: string): Promise<readonly Monster[]> {
    return this.repository.listAvailableByCampaign(campaignId);
  }

  findById(campaignId: string, id: string): Promise<Monster | null> {
    return this.repository.findById(campaignId, id);
  }

  async create(campaignId: string, input: UpdateMonsterInput): Promise<Monster> {
    const monster = createMonster(campaignId, input);
    await this.repository.save(monster);
    return monster;
  }

  async update(monster: Monster, input: UpdateMonsterInput): Promise<Monster> {
    const updated = updateMonster(monster, input);
    await this.repository.save(updated);
    return updated;
  }

  attach(campaignId: string, monsterId: string): Promise<void> {
    return this.repository.attach(campaignId, monsterId);
  }

  detach(monster: Monster): Promise<void> {
    return this.repository.detach(monster.campaignId, monster.id);
  }
}
