/**
 * But
 * Regroupe les cas d’usage de la fiche PJ utilisés par l’écran de campagne.
 *
 * Responsabilités
 * - importe, prévisualise et nettoie le portrait en brouillon ;
 * - enregistre un PJ puis retire le portrait propre à la campagne qu’il remplace ;
 * - supprime un PJ avec son portrait propre sans bloquer sur un nettoyage partiel ;
 */

import { inject, Injectable } from '@angular/core';

import { PlayerCharacterService } from '@app/features/players/application/player-character.service';
import { PlayerCharacterPortraitGateway } from '@app/features/players/data-access/player-character-portrait.gateway';
import type {
  PlayerCharacter,
  UpdatePlayerCharacterInput,
} from '@app/features/players/domain/player-character';

export type ImportedPlayerCharacterPortrait = Readonly<{ path: string; url: string }>;

export type SavePlayerCharacterCommand = Readonly<{
  campaignId: string;
  existing: PlayerCharacter | null;
  input: UpdatePlayerCharacterInput;
  portraitPath: string | null;
}>;

export type SavedPlayerCharacter = Readonly<{
  character: PlayerCharacter;
  cleanupErrors: readonly unknown[];
}>;

@Injectable({ providedIn: 'root' })
export class PlayerCharacterWorkspaceFacade {
  private readonly characters = inject(PlayerCharacterService);
  private readonly portraits = inject(PlayerCharacterPortraitGateway);

  portraitUrl(path: string): Promise<string> {
    return this.portraits.resolveUrl(path);
  }

  /** Importe un portrait choisi par le MJ ; le fichier est supprimé si sa prévisualisation échoue. */
  async importPortrait(universeId: string): Promise<ImportedPlayerCharacterPortrait | null> {
    const path = await this.portraits.chooseAndImport(universeId);
    if (!path) return null;
    try {
      return { path, url: await this.portraits.resolveUrl(path) };
    } catch (error) {
      await this.portraits.discard(path);
      throw error;
    }
  }

  /** Supprime des portraits sans s’interrompre ; retourne les erreurs rencontrées. */
  async discardPortraits(paths: readonly (string | null)[]): Promise<readonly unknown[]> {
    const errors: unknown[] = [];
    for (const path of paths) {
      if (!path) continue;
      try {
        await this.portraits.discard(path);
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
  }

  /** Enregistre le PJ puis retire le portrait propre à la campagne qu’il a remplacé. */
  async save(command: SavePlayerCharacterCommand): Promise<SavedPlayerCharacter> {
    const { existing, input, portraitPath } = command;
    const character = existing
      ? await this.characters.update(existing, input, portraitPath)
      : await this.characters.create(command.campaignId, input, portraitPath);

    const replacedPortrait =
      existing?.provenance === 'campaign' && existing.portraitPath !== character.portraitPath
        ? existing.portraitPath
        : null;
    return { character, cleanupErrors: await this.discardPortraits([replacedPortrait]) };
  }

  /** Supprime le PJ et son portrait propre ; retourne les erreurs de nettoyage non bloquantes. */
  async delete(character: PlayerCharacter): Promise<readonly unknown[]> {
    await this.characters.delete(character);
    return character.provenance === 'campaign'
      ? this.discardPortraits([character.portraitPath])
      : [];
  }
}
