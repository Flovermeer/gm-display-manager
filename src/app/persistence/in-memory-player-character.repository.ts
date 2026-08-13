import type { PlayerCharacter } from '@app/player-character/player-character';
import { PlayerCharacterRepository } from '@app/player-character/player-character.repository';

export class InMemoryPlayerCharacterRepository extends PlayerCharacterRepository {
  private readonly characters = new Map<string, PlayerCharacter>();

  override listByCampaign(campaignId: string): Promise<readonly PlayerCharacter[]> {
    return Promise.resolve(
      [...this.characters.values()]
        .filter((character) => character.campaignId === campaignId)
        .sort(
          (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
        ),
    );
  }

  override findById(campaignId: string, id: string): Promise<PlayerCharacter | null> {
    const character = this.characters.get(id);
    return Promise.resolve(character?.campaignId === campaignId ? character : null);
  }

  override save(character: PlayerCharacter): Promise<void> {
    this.characters.set(character.id, character);
    return Promise.resolve();
  }

  override delete(campaignId: string, id: string): Promise<void> {
    const character = this.characters.get(id);
    if (character?.campaignId === campaignId) this.characters.delete(id);
    return Promise.resolve();
  }
}
