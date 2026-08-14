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
import type { ResourceMentionCandidate } from '@app/shared/rich-text-editor/resource-mention';

@Injectable({ providedIn: 'root' })
export class ResourceMentionNavigationService {
  private readonly npcService = inject(NpcService);
  private readonly locationService = inject(LocationService);
  private readonly characterService = inject(PlayerCharacterService);
  private readonly router = inject(Router);
  private readonly itemService = inject(NarrativeItemService);
  private readonly sceneService = inject(SceneService, { optional: true });
  private readonly monsterService = inject(MonsterService, { optional: true });

  async listCandidates(campaignId: string): Promise<readonly ResourceMentionCandidate[]> {
    const [npcs, monsters, locations, characters, items, scenes] = await Promise.all([
      this.npcService.list(campaignId),
      this.monsterService?.list(campaignId) ?? Promise.resolve([]),
      this.locationService.list(campaignId),
      this.characterService.list(campaignId),
      this.itemService.list(campaignId),
      this.sceneService?.list(campaignId) ?? Promise.resolve([]),
    ]);
    return [
      ...characters.map(({ id, name }) => ({
        resourceType: 'player-character' as const,
        resourceId: id,
        label: name,
      })),
      ...npcs.map(({ id, name }) => ({
        resourceType: 'npc' as const,
        resourceId: id,
        label: name,
      })),
      ...monsters.map(({ id, name }) => ({
        resourceType: 'monster' as const,
        resourceId: id,
        label: name,
      })),
      ...locations.map(({ id, name }) => ({
        resourceType: 'location' as const,
        resourceId: id,
        label: name,
      })),
      ...items.map(({ id, name }) => ({
        resourceType: 'item' as const,
        resourceId: id,
        label: name,
      })),
      ...scenes.map(({ id, name }) => ({
        resourceType: 'scene' as const,
        resourceId: id,
        label: name,
      })),
    ];
  }

  open(campaignId: string, mention: ResourceMentionCandidate): Promise<boolean> {
    const segment = {
      npc: 'npcs',
      location: 'locations',
      'player-character': 'player-characters',
      item: 'items',
      scene: 'scenes',
      monster: 'bestiary',
    }[mention.resourceType];
    if (!segment) return Promise.resolve(false);
    return this.router.navigate(['/campaigns', campaignId, segment], {
      queryParams: { resourceId: mention.resourceId },
    });
  }
}
