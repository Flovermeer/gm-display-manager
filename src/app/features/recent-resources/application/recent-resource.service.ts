/**
 * But
 * Orchestre la persistance et la validation des ressources récemment consultées.
 *
 * Responsabilités
 * - résout les noms actuels des ressources d'une campagne ;
 * - purge les références qui ne sont plus disponibles dans cette campagne.
 */

import { inject, Injectable } from '@angular/core';

import { MonsterService } from '@app/features/bestiary/application/monster.service';
import { ChapterService } from '@app/features/chapters/application/chapter.service';
import { NarrativeItemService } from '@app/features/items/application/narrative-item.service';
import { LocationService } from '@app/features/locations/application/location.service';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { PlayerCharacterService } from '@app/features/players/application/player-character.service';
import { RecentResourceRepository } from '@app/features/recent-resources/data-access/recent-resource.repository';
import type {
  RecentResource,
  RecentResourceType,
} from '@app/features/recent-resources/domain/recent-resource';
import { SceneService } from '@app/features/scenes/application/scene.service';

@Injectable({ providedIn: 'root' })
export class RecentResourceService {
  private readonly repository = inject(RecentResourceRepository);
  private readonly players = inject(PlayerCharacterService);
  private readonly npcs = inject(NpcService);
  private readonly monsters = inject(MonsterService);
  private readonly locations = inject(LocationService);
  private readonly chapters = inject(ChapterService);
  private readonly items = inject(NarrativeItemService);
  private readonly scenes = inject(SceneService);

  async listAvailable(campaignId: string): Promise<readonly RecentResource[]> {
    const entries = await this.repository.list(campaignId);
    if (entries.length === 0) return [];

    const names = await this.resourceNames(campaignId);
    const available: RecentResource[] = [];
    const maintenance: Promise<void>[] = [];

    for (const entry of entries) {
      const displayName = names.get(resourceKey(entry.resourceType, entry.resourceId));
      if (!displayName) {
        maintenance.push(this.repository.remove(campaignId, entry.resourceType, entry.resourceId));
        continue;
      }
      const current = displayName === entry.displayName ? entry : { ...entry, displayName };
      available.push(current);
      if (current !== entry) maintenance.push(this.repository.save(current));
    }

    await Promise.all(maintenance);
    return available;
  }

  save(resource: RecentResource): Promise<void> {
    return this.repository.save(resource);
  }

  remove(campaignId: string, resourceType: RecentResourceType, resourceId: string): Promise<void> {
    return this.repository.remove(campaignId, resourceType, resourceId);
  }

  private async resourceNames(campaignId: string): Promise<ReadonlyMap<string, string>> {
    const [players, npcs, monsters, locations, chapters, items, scenes] = await Promise.all([
      this.players.list(campaignId),
      this.npcs.list(campaignId),
      this.monsters.list(campaignId),
      this.locations.list(campaignId),
      this.chapters.list(campaignId),
      this.items.list(campaignId),
      this.scenes.list(campaignId),
    ]);
    return new Map([
      ...players.map(({ id, name }) => [resourceKey('player-character', id), name] as const),
      ...npcs.map(({ id, name }) => [resourceKey('npc', id), name] as const),
      ...monsters.map(({ id, name }) => [resourceKey('monster', id), name] as const),
      ...locations.map(({ id, name }) => [resourceKey('location', id), name] as const),
      ...chapters.map(({ id, title }) => [resourceKey('chapter', id), title] as const),
      ...items.map(({ id, name }) => [resourceKey('item', id), name] as const),
      ...scenes.map(({ id, name }) => [resourceKey('scene', id), name] as const),
    ]);
  }
}

function resourceKey(resourceType: RecentResourceType, resourceId: string): string {
  return `${resourceType}:${resourceId}`;
}
