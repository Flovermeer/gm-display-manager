/**
 * But
 * Définit le port de persistance du bestiaire partagé.
 *
 * Responsabilités
 * - distingue le catalogue de l’univers de la sélection d’une campagne ;
 * - expose la fiche canonique sans état de combat.
 */

import type { Monster } from '@app/features/bestiary/domain/monster';

export abstract class MonsterRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly Monster[]>;
  abstract listAvailableByCampaign(campaignId: string): Promise<readonly Monster[]>;
  abstract findById(campaignId: string, id: string): Promise<Monster | null>;
  abstract save(monster: Monster): Promise<void>;
  abstract attach(campaignId: string, monsterId: string): Promise<void>;
  abstract detach(campaignId: string, monsterId: string): Promise<void>;
  abstract promote(campaignId: string, monsterId: string): Promise<void>;
  abstract resetOverride(campaignId: string, monsterId: string): Promise<void>;
}
