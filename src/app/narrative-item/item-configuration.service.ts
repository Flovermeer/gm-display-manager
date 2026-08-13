import { inject, Injectable } from '@angular/core';

import {
  createItemConfigurationOption,
  renameItemConfigurationOption,
  type ItemConfigurationKind,
  type ItemConfigurationOption,
} from './item-configuration';
import { ItemConfigurationRepository } from './item-configuration.repository';
import { NarrativeItemRepository } from './narrative-item.repository';

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
