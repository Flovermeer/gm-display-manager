import { inject, Injectable } from '@angular/core';

import {
  createItemConfigurationOption,
  renameItemConfigurationOption,
  type ItemConfigurationKind,
  type ItemConfigurationOption,
} from '@app/narrative-item/item-configuration';
import { ItemConfigurationRepository } from '@app/narrative-item/item-configuration.repository';
import { NarrativeItemRepository } from '@app/narrative-item/narrative-item.repository';

@Injectable({ providedIn: 'root' })
export class ItemConfigurationService {
  private readonly repository = inject(ItemConfigurationRepository);
  private readonly itemRepository = inject(NarrativeItemRepository);

  list(
    campaignId: string,
    kind: ItemConfigurationKind,
  ): Promise<readonly ItemConfigurationOption[]> {
    return this.repository.list(campaignId, kind);
  }

  async ensureDefaults(campaignId: string): Promise<void> {
    const [types, rarities] = await Promise.all([
      this.list(campaignId, 'type'),
      this.list(campaignId, 'rarity'),
    ]);
    if (types.length === 0) {
      await Promise.all(DEFAULT_ITEM_TYPES.map((name) => this.create(campaignId, 'type', name)));
    }
    if (rarities.length === 0) {
      await Promise.all(
        DEFAULT_ITEM_RARITIES.map((name) => this.create(campaignId, 'rarity', name)),
      );
    }
  }

  async create(campaignId: string, kind: ItemConfigurationKind, name: string) {
    const option = createItemConfigurationOption(campaignId, kind, name);
    await this.repository.save(option);
    return option;
  }

  async rename(option: ItemConfigurationOption, name: string) {
    const renamed = renameItemConfigurationOption(option, name);
    await this.repository.save(renamed);
    return renamed;
  }

  async delete(option: ItemConfigurationOption): Promise<void> {
    const usageCount = await this.itemRepository.countUsingConfiguration(
      option.campaignId,
      option.kind,
      option.id,
    );
    if (usageCount > 0) {
      throw new Error(
        `Cette valeur est utilisée par ${usageCount} objet${usageCount > 1 ? 's' : ''}.`,
      );
    }
    await this.repository.delete(option.campaignId, option.kind, option.id);
  }
}

export const DEFAULT_ITEM_TYPES = [
  'Arme',
  'Armure',
  'Anneau',
  'Objet merveilleux',
  'Document',
  'Clé',
] as const;
export const DEFAULT_ITEM_RARITIES = [
  'Courant',
  'Peu courant',
  'Rare',
  'Très rare',
  'Légendaire',
  'Artefact',
] as const;
