/**
 * But
 * Résout et ouvre les mentions de ressources utilisées dans le texte riche.
 *
 * Responsabilités
 * - agrège les candidats provenant des différentes features ;
 * - traduit une mention en navigation Angular ;
 * - affiche le texte normalement lorsque la cible n’existe plus ;
 */

import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { LocationService } from '@app/features/locations/application/location.service';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { PlayerCharacterService } from '@app/features/players/application/player-character.service';
import { NarrativeItemService } from '@app/features/items/application/narrative-item.service';
import { SceneService } from '@app/features/scenes/application/scene.service';
import { MonsterService } from '@app/features/bestiary/application/monster.service';
import { RandomTableService } from '@app/features/random-tables/application/random-table.service';
import {
  resourceRouteSegment,
  type ResourceMentionCandidate,
} from '@app/shared/rich-text-editor/resource-mention';

@Injectable({ providedIn: 'root' })
export class ResourceMentionNavigationService {
  private readonly npcService = inject(NpcService);
  private readonly locationService = inject(LocationService);
  private readonly characterService = inject(PlayerCharacterService);
  private readonly router = inject(Router);
  private readonly itemService = inject(NarrativeItemService);
  private readonly sceneService = inject(SceneService, { optional: true });
  private readonly monsterService = inject(MonsterService, { optional: true });
  private readonly randomTableService = inject(RandomTableService, { optional: true });

  async listCandidates(campaignId: string): Promise<readonly ResourceMentionCandidate[]> {
    const [npcs, monsters, locations, characters, items, scenes, tables] = await Promise.all([
      this.npcService.list(campaignId),
      this.monsterService?.list(campaignId) ?? Promise.resolve([]),
      this.locationService.list(campaignId),
      this.characterService.list(campaignId),
      this.itemService.list(campaignId),
      this.sceneService?.list(campaignId) ?? Promise.resolve([]),
      this.randomTableService?.list(campaignId) ?? Promise.resolve([]),
    ]);
    return [
      ...characters.map(({ id, name }) => ({
        resourceType: 'player-character' as const,
        resourceId: id,
        label: name,
      })),
      ...npcs.map(({ id, name, portraitPath }) => ({
        resourceType: 'npc' as const,
        resourceId: id,
        label: name,
        playerDisplayAvailable: Boolean(portraitPath),
      })),
      ...monsters.map(({ id, name, imagePath }) => ({
        resourceType: 'monster' as const,
        resourceId: id,
        label: name,
        playerDisplayAvailable: Boolean(imagePath),
      })),
      ...locations.map(({ id, name, imagePath }) => ({
        resourceType: 'location' as const,
        resourceId: id,
        label: name,
        playerDisplayAvailable: Boolean(imagePath),
      })),
      ...items.map(({ id, name, imagePath }) => ({
        resourceType: 'item' as const,
        resourceId: id,
        label: name,
        playerDisplayAvailable: Boolean(imagePath),
      })),
      ...scenes.map(({ id, name }) => ({
        resourceType: 'scene' as const,
        resourceId: id,
        label: name,
        playerDisplayAvailable: true,
      })),
      // Une table se consulte côté MJ : pas d’affichage joueurs.
      ...tables.map(({ id, name }) => ({
        resourceType: 'random-table' as const,
        resourceId: id,
        label: name,
      })),
    ];
  }

  open(campaignId: string, mention: ResourceMentionCandidate): Promise<boolean> {
    return this.router.navigate(
      ['/campaigns', campaignId, resourceRouteSegment(mention.resourceType)],
      {
        queryParams: { resourceId: mention.resourceId },
      },
    );
  }
}
