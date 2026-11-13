/**
 * But
 * Regroupe les cas d’usage de l’éditeur de ressources canoniques d’un univers.
 *
 * Responsabilités
 * - choisit le stockage de média adapté au type de ressource ;
 * - importe, prévisualise et nettoie le média principal et la vidéo idle en brouillon ;
 * - enregistre une ressource puis retire les médias qu’elle a remplacés ;
 */

import { inject, Injectable } from '@angular/core';

import { MonsterImageGateway } from '@app/features/bestiary/data-access/monster-image.gateway';
import { UniverseResourceService } from '@app/features/game-systems/application/universe-resource.service';
import type {
  UniverseResourceDetail,
  UniverseResourceType,
} from '@app/features/game-systems/domain/universe-resource';
import { ItemImageGateway } from '@app/features/items/data-access/item-image.gateway';
import { LocationImageGateway } from '@app/features/locations/data-access/location-image.gateway';
import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';
import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';
import { PlayerCharacterPortraitGateway } from '@app/features/players/data-access/player-character-portrait.gateway';

type MediaGateway = Readonly<{
  chooseAndImport(universeId: string): Promise<string | readonly string[] | null>;
  resolveUrl(path: string): Promise<string>;
  discard(path: string): Promise<void>;
}>;

export type ImportedMedia = Readonly<{ path: string; url: string }>;

/** Chemin du média principal : portrait pour les personnages, image pour les autres ressources. */
export function primaryMediaPath(resource: UniverseResourceDetail): string | null {
  return resource.type === 'npc' || resource.type === 'player-character'
    ? resource.portraitPath
    : resource.imagePath;
}

@Injectable({ providedIn: 'root' })
export class UniverseResourceEditorFacade {
  private readonly resources = inject(UniverseResourceService);
  private readonly npcPortraits = inject(NpcPortraitGateway);
  private readonly npcVideos = inject(NpcIdleVideoGateway);
  private readonly playerPortraits = inject(PlayerCharacterPortraitGateway);
  private readonly locationImages = inject(LocationImageGateway);
  private readonly itemImages = inject(ItemImageGateway);
  private readonly monsterImages = inject(MonsterImageGateway);

  async primaryMediaUrl(resource: UniverseResourceDetail): Promise<string | null> {
    const path = primaryMediaPath(resource);
    return path ? this.gateway(resource.type).resolveUrl(path) : null;
  }

  /**
   * Importe le média principal choisi par le MJ. Pour un lieu, seule la première image retenue est
   * conservée : les autres fichiers importés sont aussitôt supprimés.
   */
  async importPrimaryMedia(
    type: UniverseResourceType,
    universeId: string,
  ): Promise<ImportedMedia | null> {
    const gateway = this.gateway(type);
    const selection = await gateway.chooseAndImport(universeId);
    if (!selection) return null;
    const paths = typeof selection === 'string' ? [selection] : selection;
    const [path, ...unused] = paths;
    for (const unusedPath of unused) await gateway.discard(unusedPath);
    return path ? { path, url: await gateway.resolveUrl(path) } : null;
  }

  importIdleVideo(universeId: string): Promise<string | null> {
    return this.npcVideos.chooseAndImport(universeId);
  }

  /** Supprime des brouillons sans bloquer la navigation : un échec de nettoyage est ignoré. */
  async discardDrafts(
    type: UniverseResourceType,
    drafts: Readonly<{ primaryMediaPath?: string | null; idleVideoPath?: string | null }>,
  ): Promise<void> {
    if (drafts.primaryMediaPath) await discardSafely(this.gateway(type), drafts.primaryMediaPath);
    if (drafts.idleVideoPath) await discardSafely(this.npcVideos, drafts.idleVideoPath);
  }

  /** Enregistre la ressource, puis retire le média principal et la vidéo qu’elle a remplacés. */
  async save(
    previous: UniverseResourceDetail,
    next: UniverseResourceDetail,
  ): Promise<UniverseResourceDetail> {
    const saved = await this.resources.save(next);
    const previousPrimary = primaryMediaPath(previous);
    if (
      previous.type !== 'location' &&
      previousPrimary &&
      primaryMediaPath(saved) !== previousPrimary
    ) {
      await discardSafely(this.gateway(previous.type), previousPrimary);
    }
    if (
      previous.type === 'npc' &&
      saved.type === 'npc' &&
      previous.idleVideoPath &&
      previous.idleVideoPath !== saved.idleVideoPath
    ) {
      await discardSafely(this.npcVideos, previous.idleVideoPath);
    }
    return saved;
  }

  private gateway(type: UniverseResourceType): MediaGateway {
    switch (type) {
      case 'npc':
        return this.npcPortraits;
      case 'player-character':
        return this.playerPortraits;
      case 'location':
        return this.locationImages;
      case 'item':
        return this.itemImages;
      case 'monster':
        return this.monsterImages;
    }
  }
}

async function discardSafely(gateway: MediaGateway, path: string): Promise<void> {
  try {
    await gateway.discard(path);
  } catch {
    // Le nettoyage d'un média ne doit pas bloquer l'éditeur.
  }
}
