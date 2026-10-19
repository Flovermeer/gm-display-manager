/**
 * But
 * Affiche une ressource mentionnée dans un texte riche sur l’écran joueurs.
 *
 * Responsabilités
 * - résout la ressource dans la campagne active ;
 * - construit un état Player Display autonome ;
 * - conserve la sémantique de bascule vers le fond neutre.
 */

import { inject, Injectable, signal } from '@angular/core';

import { MonsterService } from '@app/features/bestiary/application/monster.service';
import { MonsterImageGateway } from '@app/features/bestiary/data-access/monster-image.gateway';
import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { ActiveSceneService } from '@app/features/scenes/application/active-scene.service';
import { SceneDisplayService } from '@app/features/scenes/application/scene-display.service';
import { SceneService } from '@app/features/scenes/application/scene.service';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import type { PlayerDisplayState } from '@app/features/display/domain/player-display-state';
import { PlayerDisplayStore } from '@app/features/display/application/player-display.store';
import { ItemImageGateway } from '@app/features/items/data-access/item-image.gateway';
import { NarrativeItemService } from '@app/features/items/application/narrative-item.service';
import { LocationImageGateway } from '@app/features/locations/data-access/location-image.gateway';
import { LocationService } from '@app/features/locations/application/location.service';
import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';
import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { ResourceMentionDisplayGateway } from '@app/shared/rich-text-editor/resource-mention-display.gateway';
import type { ResourceMentionCandidate } from '@app/shared/rich-text-editor/resource-mention';

@Injectable({ providedIn: 'root' })
export class ResourceMentionPlayerDisplayService extends ResourceMentionDisplayGateway {
  private readonly campaignContext = inject(CampaignContext);
  private readonly displayGateway = inject(DisplayGateway);
  private readonly displayStore = inject(PlayerDisplayStore);
  private readonly activeScene = inject(ActiveSceneService);
  private readonly sceneDisplay = inject(SceneDisplayService);
  private readonly scenes = inject(SceneService);
  private readonly npcs = inject(NpcService);
  private readonly npcPortraits = inject(NpcPortraitGateway);
  private readonly npcVideos = inject(NpcIdleVideoGateway);
  private readonly locations = inject(LocationService);
  private readonly locationImages = inject(LocationImageGateway);
  private readonly items = inject(NarrativeItemService);
  private readonly itemImages = inject(ItemImageGateway);
  private readonly monsters = inject(MonsterService);
  private readonly monsterImages = inject(MonsterImageGateway);
  private readonly playerDisplayOpen = signal(false);
  private readonly publishing = signal(false);

  override readonly isPlayerDisplayOpen = this.playerDisplayOpen.asReadonly();
  override readonly isPublishing = this.publishing.asReadonly();

  override async refreshPlayerDisplayStatus(): Promise<void> {
    this.playerDisplayOpen.set(
      this.displayGateway.isDesktop && (await this.displayGateway.isPlayerDisplayOpen()),
    );
  }

  override isDisplayed(candidate: ResourceMentionCandidate): boolean {
    const state = this.displayStore.state();
    switch (candidate.resourceType) {
      case 'npc':
        return state.mode === 'npc' && state.npcId === candidate.resourceId;
      case 'monster':
        return state.mode === 'monster' && state.monsterId === candidate.resourceId;
      case 'location':
        return state.mode === 'location' && state.locationId === candidate.resourceId;
      case 'item':
        return state.mode === 'item' && state.itemId === candidate.resourceId;
      case 'scene':
        return state.mode === 'scene' && state.sceneId === candidate.resourceId;
      default:
        return false;
    }
  }

  override async display(candidate: ResourceMentionCandidate): Promise<void> {
    if (
      !candidate.playerDisplayAvailable ||
      !this.isPlayerDisplayOpen() ||
      this.isPublishing()
    ) {
      return;
    }
    const campaign = this.campaignContext.campaign() ?? (await this.campaignContext.load());
    if (!campaign) return;

    this.publishing.set(true);
    try {
      if (this.isDisplayed(candidate)) {
        await this.activeScene.clear(campaign.id);
        await this.send({ mode: 'neutral' });
        return;
      }
      if (candidate.resourceType === 'scene') {
        const scene = await this.scenes.findById(campaign.id, candidate.resourceId);
        if (scene) await this.send(await this.sceneDisplay.activate(scene));
        return;
      }

      const state = await this.buildStandaloneState(campaign.id, candidate);
      if (!state) return;
      await this.activeScene.clear(campaign.id);
      await this.send(state);
    } finally {
      this.publishing.set(false);
    }
  }

  private async buildStandaloneState(
    campaignId: string,
    candidate: ResourceMentionCandidate,
  ): Promise<PlayerDisplayState | null> {
    switch (candidate.resourceType) {
      case 'npc': {
        const npc = (await this.npcs.list(campaignId)).find(({ id }) => id === candidate.resourceId);
        if (!npc?.portraitPath) return null;
        return {
          mode: 'npc',
          npcId: npc.id,
          name: npc.name,
          portraitPath: await this.npcPortraits.resolveUrl(npc.portraitPath),
          idleVideoPath: npc.idleVideoPath
            ? await this.npcVideos.resolveUrl(npc.idleVideoPath)
            : undefined,
        };
      }
      case 'location': {
        const location = (await this.locations.list(campaignId)).find(
          ({ id }) => id === candidate.resourceId,
        );
        if (!location?.imagePath) return null;
        return {
          mode: 'location',
          locationId: location.id,
          name: location.hideNameOnPlayerDisplay ? undefined : location.name,
          imagePath: await this.locationImages.resolveUrl(location.imagePath),
        };
      }
      case 'item': {
        const item = (await this.items.list(campaignId)).find(
          ({ id }) => id === candidate.resourceId,
        );
        if (!item?.imagePath) return null;
        return {
          mode: 'item',
          itemId: item.id,
          name: item.name,
          summary: item.summary,
          imagePath: await this.itemImages.resolveUrl(item.imagePath),
        };
      }
      case 'monster': {
        if (candidate.playerDisplayImagePath) {
          return {
            mode: 'monster',
            monsterId: candidate.resourceId,
            name: candidate.label,
            imagePath: await this.monsterImages.resolveUrl(candidate.playerDisplayImagePath),
          };
        }
        const monster = await this.monsters.findById(campaignId, candidate.resourceId);
        if (!monster?.imagePath) return null;
        return {
          mode: 'monster',
          monsterId: monster.id,
          name: monster.name,
          imagePath: await this.monsterImages.resolveUrl(monster.imagePath),
        };
      }
      default:
        return null;
    }
  }

  private async send(state: PlayerDisplayState): Promise<void> {
    this.displayStore.setState(state);
    try {
      await this.displayGateway.sendPlayerDisplayState(state);
    } catch (error) {
      this.playerDisplayOpen.set(false);
      throw error;
    }
  }
}
