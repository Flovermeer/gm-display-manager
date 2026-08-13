import type {
  ItemConfigurationKind,
  ItemConfigurationOption,
} from '../narrative-item/item-configuration';
import { ItemConfigurationRepository } from '../narrative-item/item-configuration.repository';

export class InMemoryItemConfigurationRepository extends ItemConfigurationRepository {
  private readonly options = new Map<string, ItemConfigurationOption>();

  override list(
    campaignId: string,
    kind: ItemConfigurationKind,
  ): Promise<readonly ItemConfigurationOption[]> {
    return Promise.resolve(
      [...this.options.values()]
        .filter((option) => option.campaignId === campaignId && option.kind === kind)
        .sort(
          (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
        ),
    );
  }

  override findById(
    campaignId: string,
    kind: ItemConfigurationKind,
    id: string,
  ): Promise<ItemConfigurationOption | null> {
    const option = this.options.get(id);
    return Promise.resolve(
      option?.campaignId === campaignId && option.kind === kind ? option : null,
    );
  }

  override save(option: ItemConfigurationOption): Promise<void> {
    const duplicate = [...this.options.values()].some(
      (candidate) =>
        candidate.id !== option.id &&
        candidate.campaignId === option.campaignId &&
        candidate.kind === option.kind &&
        candidate.name.localeCompare(option.name, 'fr', { sensitivity: 'base' }) === 0,
    );
    if (duplicate) throw new Error('Cette valeur existe déjà dans la campagne.');
    this.options.set(option.id, option);
    return Promise.resolve();
  }

  override delete(campaignId: string, kind: ItemConfigurationKind, id: string): Promise<void> {
    const option = this.options.get(id);
    if (option?.campaignId === campaignId && option.kind === kind) this.options.delete(id);
    return Promise.resolve();
  }
}
