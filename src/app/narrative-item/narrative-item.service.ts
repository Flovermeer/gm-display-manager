import { inject, Injectable } from '@angular/core';

import { LocationService } from '@app/location/location.service';
import { NpcService } from '@app/npc/npc.service';
import { PlayerCharacterService } from '@app/player-character/player-character.service';
import { ItemConfigurationRepository } from '@app/narrative-item/item-configuration.repository';
import {
  createNarrativeItem,
  updateNarrativeItem,
  type NarrativeItem,
  type UpdateNarrativeItemInput,
} from '@app/narrative-item/narrative-item';
import { NarrativeItemRepository } from '@app/narrative-item/narrative-item.repository';

@Injectable({ providedIn: 'root' })
export class NarrativeItemService {
  private readonly repository = inject(NarrativeItemRepository);
  private readonly configurationRepository = inject(ItemConfigurationRepository);
  private readonly npcService = inject(NpcService);
  private readonly locationService = inject(LocationService);
  private readonly characterService = inject(PlayerCharacterService);

  list(campaignId: string): Promise<readonly NarrativeItem[]> {
    return this.repository.listByCampaign(campaignId);
  }

  async create(
    campaignId: string,
    input: UpdateNarrativeItemInput,
    imagePath: string | null = null,
  ) {
    await this.assertReferences(campaignId, input);
    const item = createNarrativeItem(campaignId, input, imagePath);
    await this.repository.save(item);
    return item;
  }

  async update(item: NarrativeItem, input: UpdateNarrativeItemInput, imagePath = item.imagePath) {
    await this.assertReferences(item.campaignId, input);
    const updated = updateNarrativeItem(item, input, imagePath);
    await this.repository.save(updated);
    return updated;
  }

  delete(item: NarrativeItem): Promise<void> {
    return this.repository.delete(item.campaignId, item.id);
  }

  private async assertReferences(
    campaignId: string,
    input: UpdateNarrativeItemInput,
  ): Promise<void> {
    const [type, rarity] = await Promise.all([
      this.configurationRepository.findById(campaignId, 'type', input.itemTypeId),
      input.itemRarityId
        ? this.configurationRepository.findById(campaignId, 'rarity', input.itemRarityId)
        : null,
    ]);
    if (!type) throw new Error("Le type d'objet n'appartient pas à cette campagne.");
    if (input.itemRarityId && !rarity)
      throw new Error("La rareté de l'objet n'appartient pas à cette campagne.");
    if (!input.owner) return;
    const owners = {
      npc: () => this.npcService.list(campaignId),
      location: () => this.locationService.list(campaignId),
      'player-character': () => this.characterService.list(campaignId),
    };
    const candidates = await owners[input.owner.resourceType]();
    if (!candidates.some(({ id }) => id === input.owner?.resourceId))
      throw new Error("Le détenteur de l'objet n'appartient pas à cette campagne.");
  }
}
