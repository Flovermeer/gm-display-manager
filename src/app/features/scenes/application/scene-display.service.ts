/**
 * But
 * Construit l’état du Player Display à partir d’une scène.
 *
 * Responsabilités
 * - résout le fond de lieu et les médias ;
 * - active ou restaure la scène persistée ;
 * - retombe sur l’écran par défaut si nécessaire ;
 */

import { inject, Injectable } from '@angular/core';

import type {
  PlayerDisplayForeground,
  PlayerDisplayState,
} from '@app/features/display/domain/player-display-state';
import { LocationService } from '@app/features/locations/application/location.service';
import { LocationImageGateway } from '@app/features/locations/data-access/location-image.gateway';
import { ItemImageGateway } from '@app/features/items/data-access/item-image.gateway';
import type { NarrativeItem } from '@app/features/items/domain/narrative-item';
import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';
import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';
import type { Npc } from '@app/features/npcs/domain/npc';
import { playerDisplayName } from '@app/features/locations/domain/location';
import type { Scene } from '@app/features/scenes/domain/scene';
import { ActiveSceneService } from '@app/features/scenes/application/active-scene.service';
import { SceneService } from '@app/features/scenes/application/scene.service';

@Injectable({ providedIn: 'root' })
export class SceneDisplayService {
  private readonly activeSceneService = inject(ActiveSceneService);
  private readonly sceneService = inject(SceneService);
  private readonly locationService = inject(LocationService);
  private readonly locationImageGateway = inject(LocationImageGateway);
  private readonly npcPortraits = inject(NpcPortraitGateway);
  private readonly npcIdleVideos = inject(NpcIdleVideoGateway);
  private readonly itemImages = inject(ItemImageGateway);

  async activate(scene: Scene): Promise<PlayerDisplayState> {
    const state = await this.build(scene);
    await this.activeSceneService.set(scene.campaignId, scene.id);
    return state;
  }

  async build(scene: Scene, foreground?: PlayerDisplayForeground): Promise<PlayerDisplayState> {
    const location = scene.locationId
      ? await this.locationService
          .list(scene.campaignId)
          .then((locations) => locations.find(({ id }) => id === scene.locationId) ?? null)
      : null;
    const background = location?.imagePath
      ? {
          type: 'image' as const,
          imagePath: await this.locationImageGateway.resolveUrl(location.imagePath),
          name: playerDisplayName(location),
        }
      : { type: 'default' as const };
    return { mode: 'scene', sceneId: scene.id, sceneName: scene.name, background, foreground };
  }

  /** Scène avec un PNJ au premier plan ; le PNJ doit posséder un portrait. */
  async buildWithNpc(
    scene: Scene,
    npc: Npc & { portraitPath: string },
  ): Promise<PlayerDisplayState> {
    return this.build(scene, {
      type: 'npc',
      resourceId: npc.id,
      name: npc.name,
      imagePath: await this.npcPortraits.resolveUrl(npc.portraitPath),
      idleVideoPath: npc.idleVideoPath
        ? await this.npcIdleVideos.resolveUrl(npc.idleVideoPath)
        : undefined,
    });
  }

  /** Scène avec un objet au premier plan ; l’objet doit posséder une image. */
  async buildWithItem(
    scene: Scene,
    item: NarrativeItem & { imagePath: string },
  ): Promise<PlayerDisplayState> {
    return this.build(scene, {
      type: 'item',
      resourceId: item.id,
      name: item.name,
      imagePath: await this.itemImages.resolveUrl(item.imagePath),
      summary: item.summary,
    });
  }

  async restore(campaignId: string): Promise<PlayerDisplayState> {
    const sceneId = await this.activeSceneService.get(campaignId);
    if (!sceneId) return defaultSceneState();
    const scene = await this.sceneService.findById(campaignId, sceneId);
    if (!scene) {
      await this.activeSceneService.clear(campaignId);
      return defaultSceneState();
    }
    return this.build(scene);
  }
}

export function defaultSceneState(): PlayerDisplayState {
  return { mode: 'neutral' };
}
