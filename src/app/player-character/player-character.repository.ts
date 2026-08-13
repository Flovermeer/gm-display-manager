import type { PlayerCharacter } from '@app/player-character/player-character';

export abstract class PlayerCharacterRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly PlayerCharacter[]>;
  abstract findById(campaignId: string, id: string): Promise<PlayerCharacter | null>;
  abstract save(character: PlayerCharacter): Promise<void>;
  abstract delete(campaignId: string, id: string): Promise<void>;
}
