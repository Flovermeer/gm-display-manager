/**
 * But
 * Orchestre la gestion des ressources canoniques d'un univers.
 *
 * Responsabilités
 * - expose les catalogues à la configuration globale ;
 * - coordonne les transitions vers et depuis la corbeille.
 */

import { inject, Injectable } from '@angular/core';

import { UniverseResourceRepository } from '@app/features/game-systems/data-access/universe-resource.repository';
import type {
  UniverseResourceDetail,
  UniverseResourceDetailFor,
  UniverseResourceSummary,
  UniverseResourceType,
} from '@app/features/game-systems/domain/universe-resource';
import { createEmptyMonsterSheet } from '@app/features/bestiary/domain/monster';
import {
  createNarrativeItem,
  emptyNarrativeItemInput,
} from '@app/features/items/domain/narrative-item';
import { createEmptyNpcSheet, normalizeNpcSheet } from '@app/features/npcs/domain/npc';
import {
  createPlayerCharacter,
  EMPTY_PLAYER_CHARACTER_SHEET,
} from '@app/features/players/domain/player-character';

@Injectable({ providedIn: 'root' })
export class UniverseResourceService {
  private readonly repository = inject(UniverseResourceRepository);

  list(
    universeId: string,
    type: UniverseResourceType,
  ): Promise<readonly UniverseResourceSummary[]> {
    return this.repository.list(universeId, type);
  }

  find(
    universeId: string,
    type: UniverseResourceType,
    id: string,
  ): Promise<UniverseResourceDetail | null> {
    return this.repository.find(universeId, type, id);
  }

  createDraft<TType extends UniverseResourceType>(
    universeId: string,
    type: TType,
  ): UniverseResourceDetailFor<TType> {
    const timestamp = new Date().toISOString();
    const base = {
      id: crypto.randomUUID(),
      universeId,
      name: '',
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    switch (type) {
      case 'npc':
        return {
          ...base,
          type,
          portraitPath: null,
          idleVideoPath: null,
          sheet: createEmptyNpcSheet(),
        } as UniverseResourceDetailFor<TType>;
      case 'player-character':
        return {
          ...base,
          type,
          maxHitPoints: null,
          portraitPath: null,
          sheet: EMPTY_PLAYER_CHARACTER_SHEET,
        } as UniverseResourceDetailFor<TType>;
      case 'location':
        return {
          ...base,
          type,
          parentLocationId: null,
          summary: '',
          imagePath: null,
        } as UniverseResourceDetailFor<TType>;
      case 'item': {
        const item = emptyNarrativeItemInput();
        return {
          ...base,
          type,
          itemTypeId: item.itemTypeId,
          itemRarityId: item.itemRarityId,
          attunement: item.attunement,
          attunementCondition: item.attunementCondition,
          summary: item.summary,
          description: item.description,
          imagePath: null,
        } as UniverseResourceDetailFor<TType>;
      }
      case 'monster':
        return {
          ...base,
          type,
          imagePath: null,
          sheet: createEmptyMonsterSheet(),
        } as UniverseResourceDetailFor<TType>;
    }
  }

  async save(resource: UniverseResourceDetail): Promise<UniverseResourceDetail> {
    const name = resource.name.trim();
    if (!name) throw new Error('Le nom de la ressource est obligatoire.');
    const normalized = this.normalize({ ...resource, name, updatedAt: new Date().toISOString() });
    await this.repository.save(normalized);
    return normalized;
  }

  private normalize(resource: UniverseResourceDetail): UniverseResourceDetail {
    switch (resource.type) {
      case 'npc':
      case 'monster':
        return { ...resource, sheet: normalizeNpcSheet(resource.sheet) };
      case 'player-character': {
        const normalized = createPlayerCharacter('', {
          name: resource.name,
          playerName: '',
          status: 'active',
          currentHitPoints: null,
          maxHitPoints: resource.maxHitPoints,
          portraitPath: resource.portraitPath,
          sheet: { ...resource.sheet, privateNotes: '' },
        });
        return {
          ...resource,
          name: normalized.name,
          maxHitPoints: normalized.maxHitPoints,
          portraitPath: normalized.portraitPath,
          sheet: normalized.sheet,
        };
      }
      case 'location':
        if (resource.parentLocationId === resource.id) {
          throw new Error('Un lieu ne peut pas être son propre parent.');
        }
        return { ...resource, summary: resource.summary.trim() };
      case 'item': {
        const normalized = createNarrativeItem('', {
          itemTypeId: resource.itemTypeId,
          itemRarityId: resource.itemRarityId,
          owner: null,
          name: resource.name,
          status: 'active',
          attunement: resource.attunement,
          attunementCondition: resource.attunementCondition,
          summary: resource.summary,
          description: resource.description,
        });
        return {
          ...resource,
          itemTypeId: normalized.itemTypeId,
          itemRarityId: normalized.itemRarityId,
          name: normalized.name,
          attunement: normalized.attunement,
          attunementCondition: normalized.attunementCondition,
          summary: normalized.summary,
          description: normalized.description,
        };
      }
    }
  }

  trash(resource: UniverseResourceSummary): Promise<void> {
    return this.repository.trash(resource.universeId, resource.type, resource.id);
  }

  restore(resource: UniverseResourceSummary): Promise<void> {
    return this.repository.restore(resource.universeId, resource.type, resource.id);
  }
}
