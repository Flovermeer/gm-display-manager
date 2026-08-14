/**
 * But
 * Définit le port de persistance de la configuration des objets.
 *
 * Responsabilités
 * - gère les types et raretés propres à une campagne ;
 */

import type {
  ItemConfigurationKind,
  ItemConfigurationOption,
} from '@app/features/items/domain/item-configuration';

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
