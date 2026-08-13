import type { ItemConfigurationKind, ItemConfigurationOption } from '@app/narrative-item/item-configuration';

export abstract class ItemConfigurationRepository {
  abstract list(
    campaignId: string,
    kind: ItemConfigurationKind,
  ): Promise<readonly ItemConfigurationOption[]>;
  abstract findById(
    campaignId: string,
    kind: ItemConfigurationKind,
    id: string,
  ): Promise<ItemConfigurationOption | null>;
  abstract save(option: ItemConfigurationOption): Promise<void>;
  abstract delete(campaignId: string, kind: ItemConfigurationKind, id: string): Promise<void>;
}
