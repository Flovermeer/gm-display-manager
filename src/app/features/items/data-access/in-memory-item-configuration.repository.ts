/**
 * But
 * Conserve la configuration des objets en mémoire.
 *
 * Responsabilités
 * - sert au navigateur et aux tests hors Tauri ;
 */

import type {
  ItemConfigurationKind,
  ItemConfigurationOption,
} from '@app/features/items/domain/item-configuration';
import { ItemConfigurationRepository } from '@app/features/items/data-access/item-configuration.repository';

export class InMemoryItemConfigurationRepository extends ItemConfigurationRepository {
  private readonly options = new Map<string, ItemConfigurationOption>();

  override list(
    universeId: string,
    kind: ItemConfigurationKind,
  ): Promise<readonly ItemConfigurationOption[]> {
    return Promise.resolve(
      [...this.options.values()]
        .filter((option) => option.universeId === universeId && option.kind === kind)
        .sort(
          (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
        ),
    );
  }

  override findByIdForCampaign(
    campaignId: string,
    kind: ItemConfigurationKind,
    id: string,
  ): Promise<ItemConfigurationOption | null> {
    const option = this.options.get(id);
    return Promise.resolve(option && option.kind === kind ? option : null);
  }

  override save(option: ItemConfigurationOption): Promise<void> {
    const duplicate = [...this.options.values()].some(
      (candidate) =>
        candidate.id !== option.id &&
        candidate.universeId === option.universeId &&
        candidate.kind === option.kind &&
        candidate.name.localeCompare(option.name, 'fr', { sensitivity: 'base' }) === 0,
    );
    if (duplicate) throw new Error('Cette valeur existe déjà dans la campagne.');
    this.options.set(option.id, option);
    return Promise.resolve();
  }

  override delete(universeId: string, kind: ItemConfigurationKind, id: string): Promise<void> {
    const option = this.options.get(id);
    if (option?.universeId === universeId && option.kind === kind) this.options.delete(id);
    return Promise.resolve();
  }
}
