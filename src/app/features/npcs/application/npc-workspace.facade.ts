/**
 * But
 * Regroupe les cas d’usage de la fiche PNJ utilisés par l’écran de campagne.
 *
 * Responsabilités
 * - importe, prévisualise et nettoie les portraits et vidéos en brouillon ;
 * - enregistre une fiche puis actualise l’écran joueurs et les médias remplacés ;
 * - affiche ou retire un PNJ de l’écran joueurs ;
 * - supprime un PNJ avec ses médias sans bloquer sur un nettoyage partiel ;
 */

import { inject, Injectable } from '@angular/core';

import { PlayerDisplayPublisher } from '@app/features/display/application/player-display-publisher.service';
import {
  isDisplayingResource,
  type PlayerDisplayState,
  type PlayerDisplayStateOf,
} from '@app/features/display/domain/player-display-state';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';
import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';
import {
  DEMO_NPC_PORTRAIT_URL,
  npcPlayerDisplayState,
  type Npc,
  type UpdateNpcInput,
} from '@app/features/npcs/domain/npc';

export type ImportedNpcPortrait = Readonly<{ path: string; url: string }>;

export type SaveNpcCommand = Readonly<{
  campaignId: string;
  existing: Npc | null;
  input: UpdateNpcInput;
  portraitPath: string | null;
  idleVideoPath: string | null;
  isPlayerDisplayOpen: boolean;
}>;

@Injectable({ providedIn: 'root' })
export class NpcWorkspaceFacade {
  private readonly npcs = inject(NpcService);
  private readonly portraits = inject(NpcPortraitGateway);
  private readonly idleVideos = inject(NpcIdleVideoGateway);
  private readonly playerDisplay = inject(PlayerDisplayPublisher);

  readonly playerDisplayState = this.playerDisplay.state;

  isPlayerDisplayOpen(): Promise<boolean> {
    return this.playerDisplay.isOpen();
  }

  isDisplayed(npc: Npc, state: PlayerDisplayState = this.playerDisplay.state()): boolean {
    return isDisplayingResource(state, 'npc', npc.id);
  }

  async portraitUrl(portraitPath: string | null): Promise<string> {
    return portraitPath ? this.portraits.resolveUrl(portraitPath) : DEMO_NPC_PORTRAIT_URL;
  }

  /** Importe un portrait choisi par le MJ ; le fichier est supprimé si sa prévisualisation échoue. */
  async importPortrait(universeId: string): Promise<ImportedNpcPortrait | null> {
    const path = await this.portraits.chooseAndImport(universeId);
    if (!path) return null;
    try {
      return { path, url: await this.portraits.resolveUrl(path) };
    } catch (error) {
      await this.portraits.discard(path);
      throw error;
    }
  }

  importIdleVideo(universeId: string): Promise<string | null> {
    return this.idleVideos.chooseAndImport(universeId);
  }

  /** Supprime des médias sans s’interrompre ; retourne les erreurs rencontrées. */
  async discardMedia(
    media: Readonly<{ portraitPath?: string | null; idleVideoPath?: string | null }>,
  ): Promise<readonly unknown[]> {
    const errors: unknown[] = [];
    const attempts = [
      media.portraitPath ? () => this.portraits.discard(media.portraitPath!) : null,
      media.idleVideoPath ? () => this.idleVideos.discard(media.idleVideoPath!) : null,
    ];
    for (const attempt of attempts) {
      if (!attempt) continue;
      try {
        await attempt();
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
  }

  /** Enregistre la fiche, actualise l’écran joueurs puis retire la vidéo remplacée. */
  async save(command: SaveNpcCommand): Promise<Npc> {
    const { existing, input, portraitPath, idleVideoPath } = command;
    const saved = existing
      ? await this.npcs.update(existing, input, portraitPath, idleVideoPath)
      : await this.npcs.create(command.campaignId, input, portraitPath, idleVideoPath);

    await this.refreshPlayerDisplay(saved, command.isPlayerDisplayOpen);
    const previousIdleVideoPath = existing?.idleVideoPath ?? null;
    if (previousIdleVideoPath && previousIdleVideoPath !== saved.idleVideoPath) {
      await this.idleVideos.discard(previousIdleVideoPath);
    }
    return saved;
  }

  /** Affiche le PNJ aux joueurs, ou revient au fond neutre s’il est déjà affiché. */
  async toggleOnPlayerDisplay(npc: Npc): Promise<void> {
    await this.playerDisplay.toggle(
      npc.campaignId,
      (state) => this.isDisplayed(npc, state),
      async () => npcPlayerDisplayState(npc, await this.displayMedia(npc)),
    );
  }

  /** Supprime le PNJ et ses médias ; retourne les erreurs de nettoyage non bloquantes. */
  async delete(npc: Npc, isPlayerDisplayOpen: boolean): Promise<readonly unknown[]> {
    await this.playerDisplay.withdraw((state) => this.isDisplayed(npc, state), isPlayerDisplayOpen);
    await this.npcs.delete(npc);
    return this.discardMedia(npc);
  }

  private async refreshPlayerDisplay(npc: Npc, isPlayerDisplayOpen: boolean): Promise<void> {
    await this.playerDisplay.refresh(
      (state): state is PlayerDisplayStateOf<'npc'> => this.isDisplayed(npc, state),
      async (current) => {
        const media = await this.displayMedia(npc);
        return {
          ...current,
          name: npc.name,
          portraitPath: media.portraitUrl,
          idleVideoPath: media.idleVideoUrl ?? undefined,
        };
      },
      isPlayerDisplayOpen,
    );
  }

  private async displayMedia(
    npc: Npc,
  ): Promise<Readonly<{ portraitUrl: string; idleVideoUrl: string | null }>> {
    return {
      portraitUrl: await this.portraitUrl(npc.portraitPath),
      idleVideoUrl: npc.idleVideoPath ? await this.idleVideos.resolveUrl(npc.idleVideoPath) : null,
    };
  }
}
