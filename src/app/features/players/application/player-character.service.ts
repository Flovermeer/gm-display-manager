/**
 * But
 * Orchestre le cycle de vie et les points de vie des PJ.
 *
 * Responsabilités
 * - applique les règles de création et de modification ;
 * - coordonne les mises à jour rapides de points de vie ;
 */

import { inject, Injectable } from '@angular/core';

import {
  createPlayerCharacter,
  updatePlayerCharacter,
  updatePlayerCharacterHitPoints,
  type PlayerCharacter,
  type UpdatePlayerCharacterInput,
} from '@app/features/players/domain/player-character';
import { PlayerCharacterRepository } from '@app/features/players/data-access/player-character.repository';

@Injectable({ providedIn: 'root' })
export class PlayerCharacterService {
  private readonly repository = inject(PlayerCharacterRepository);

  list(campaignId: string): Promise<readonly PlayerCharacter[]> {
    return this.repository.listByCampaign(campaignId);
  }

  async create(
    campaignId: string,
    input: UpdatePlayerCharacterInput,
    portraitPath: string | null = null,
  ): Promise<PlayerCharacter> {
    const character = createPlayerCharacter(campaignId, { ...input, portraitPath });
    await this.repository.save(character);
    return character;
  }

  async update(
    character: PlayerCharacter,
    input: UpdatePlayerCharacterInput,
    portraitPath: string | null = character.portraitPath,
  ): Promise<PlayerCharacter> {
    const updatedCharacter = updatePlayerCharacter(character, { ...input, portraitPath });
    await this.repository.save(updatedCharacter);
    return updatedCharacter;
  }

  async updateHitPoints(
    character: PlayerCharacter,
    currentHitPoints: number,
  ): Promise<PlayerCharacter> {
    const updatedCharacter = updatePlayerCharacterHitPoints(character, currentHitPoints);
    await this.repository.save(updatedCharacter);
    return updatedCharacter;
  }

  delete(character: PlayerCharacter): Promise<void> {
    return this.repository.delete(character.campaignId, character.id);
  }
}
