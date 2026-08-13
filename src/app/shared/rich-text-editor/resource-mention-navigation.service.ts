import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { LocationService } from '../../location/location.service';
import { NpcService } from '../../npc/npc.service';
import { PlayerCharacterService } from '../../player-character/player-character.service';
import type { ResourceMentionCandidate } from './resource-mention';

@Injectable({ providedIn: 'root' })
export class ResourceMentionNavigationService {
  private readonly npcService = inject(NpcService);
  private readonly locationService = inject(LocationService);
  private readonly characterService = inject(PlayerCharacterService);
  private readonly router = inject(Router);

  async listCandidates(campaignId: string): Promise<readonly ResourceMentionCandidate[]> {
    const [npcs, locations, characters] = await Promise.all([
      this.npcService.list(campaignId),
      this.locationService.list(campaignId),
      this.characterService.list(campaignId),
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
      ...locations.map(({ id, name }) => ({
        resourceType: 'location' as const,
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
      item: null,
    }[mention.resourceType];
    if (!segment) return Promise.resolve(false);
    return this.router.navigate(['/campaigns', campaignId, segment], {
      queryParams: { resourceId: mention.resourceId },
    });
  }
}
