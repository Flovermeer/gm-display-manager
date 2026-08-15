/**
 * But
 * Définit le port de persistance des PJ.
 *
 * Responsabilités
 * - expose les opérations attendues par le service ;
 * - garde SQLite hors de l’application ;
 */

import type { PlayerCharacter } from '@app/features/players/domain/player-character';

export abstract class PlayerCharacterRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly PlayerCharacter[]>;
  abstract listAvailableByCampaign(campaignId: string): Promise<readonly PlayerCharacter[]>;
  abstract findById(campaignId: string, id: string): Promise<PlayerCharacter | null>;
  abstract save(character: PlayerCharacter): Promise<void>;
  abstract saveCampaignState(character: PlayerCharacter): Promise<void>;
  abstract delete(campaignId: string, id: string): Promise<void>;
  abstract attach(campaignId: string, id: string): Promise<void>;
  abstract promote(campaignId: string, id: string): Promise<void>;
  abstract resetOverride(campaignId: string, id: string): Promise<void>;
}
