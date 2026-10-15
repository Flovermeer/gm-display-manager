/**
 * But
 * Orchestre les valeurs configurables des objets.
 *
 * Responsabilités
 * - initialise les valeurs par défaut ;
 * - empêche la suppression d’une valeur encore utilisée ;
 */

import { inject, Injectable } from '@angular/core';

import {
  createItemConfigurationOption,
  renameItemConfigurationOption,
  type ItemConfigurationKind,
  type ItemConfigurationOption,
} from '@app/features/items/domain/item-configuration';
import { ItemConfigurationRepository } from '@app/features/items/data-access/item-configuration.repository';
import { NarrativeItemRepository } from '@app/features/items/data-access/narrative-item.repository';
import { GameSystemService } from '@app/features/game-systems/application/game-system.service';
import { genericUniverseId } from '@app/features/game-systems/domain/game-system';

@Injectable({ providedIn: 'root' })
export class ItemConfigurationService {
  private readonly repository = inject(ItemConfigurationRepository);
  private readonly itemRepository = inject(NarrativeItemRepository);
  private readonly gameSystemService = inject(GameSystemService);
  private readonly defaultInitializations = new Map<string, Promise<void>>();

  list(
    universeId: string,
    kind: ItemConfigurationKind,
  ): Promise<readonly ItemConfigurationOption[]> {
    return this.repository.list(universeId, kind);
  }

  async listForCampaign(
    universeId: string,
    kind: ItemConfigurationKind,
  ): Promise<readonly ItemConfigurationOption[]> {
    const universe = await this.gameSystemService.findUniverse(universeId);
    if (!universe) return this.list(universeId, kind);

    const [specific, generic] = await Promise.all([
      this.list(universeId, kind),
      this.list(genericUniverseId(universe.gameSystemId), kind),
    ]);
    return [...specific, ...generic].sort(
      (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
    );
  }

  ensureDefaults(universeId: string): Promise<void> {
    const pending = this.defaultInitializations.get(universeId);
    if (pending) return pending;
    const initialization = this.initializeDefaults(universeId).finally(() =>
      this.defaultInitializations.delete(universeId),
    );
    this.defaultInitializations.set(universeId, initialization);
    return initialization;
  }

  private async initializeDefaults(universeId: string): Promise<void> {
    const [types, rarities] = await Promise.all([
      this.list(universeId, 'type'),
      this.list(universeId, 'rarity'),
    ]);
    if (types.length === 0) {
      await Promise.all(DEFAULT_ITEM_TYPES.map((name) => this.create(universeId, 'type', name)));
    }
    if (rarities.length === 0) {
      await Promise.all(
        DEFAULT_ITEM_RARITIES.map((name) => this.create(universeId, 'rarity', name)),
      );
    }
  }

  async create(universeId: string, kind: ItemConfigurationKind, name: string) {
    const option = createItemConfigurationOption(universeId, kind, name);
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
      option.universeId,
      option.kind,
      option.id,
    );
    if (usageCount > 0) {
      throw new Error(
        `Cette valeur est utilisée par ${usageCount} objet${usageCount > 1 ? 's' : ''}.`,
      );
    }
    await this.repository.delete(option.universeId, option.kind, option.id);
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
