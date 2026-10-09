/**
 * But
 * Orchestre les référentiels structurés utilisés par les fiches de créatures.
 *
 * Responsabilités
 * - expose les catalogues système et univers ;
 * - valide les catégories extensibles et la relation type/sous-espèce.
 */

import { inject, Injectable } from '@angular/core';

import { GameRuleOptionRepository } from '@app/features/game-systems/data-access/game-rule-option.repository';
import {
  createUniverseRuleOption,
  type GameRuleCategory,
  type GameRuleOption,
} from '@app/features/game-systems/domain/game-rule-option';

type ExtensibleCategory = Extract<
  GameRuleCategory,
  'creature_type' | 'creature_subspecies' | 'language' | 'race' | 'class'
>;

@Injectable({ providedIn: 'root' })
export class GameRuleOptionService {
  private readonly repository = inject(GameRuleOptionRepository);

  listForSystem(
    gameSystemId: string,
    category: GameRuleCategory,
  ): Promise<readonly GameRuleOption[]> {
    return this.repository.listForSystem(gameSystemId, category);
  }

  listForUniverse(
    gameSystemId: string,
    universeId: string,
    category: GameRuleCategory,
  ): Promise<readonly GameRuleOption[]> {
    return this.repository.listForUniverse(gameSystemId, universeId, category);
  }

  async addForUniverse(
    gameSystemId: string,
    universeId: string,
    category: ExtensibleCategory,
    label: string,
    parentOptionId: string | null = null,
  ): Promise<GameRuleOption> {
    const option = createUniverseRuleOption(
      gameSystemId,
      universeId,
      category,
      label,
      parentOptionId,
    );
    await this.repository.save(option);
    return option;
  }
}
