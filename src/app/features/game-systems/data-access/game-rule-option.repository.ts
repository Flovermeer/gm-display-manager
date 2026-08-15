/**
 * But
 * Définit le port de lecture et d’enrichissement des référentiels de règles.
 *
 * Responsabilités
 * - fusionne les valeurs natives du système avec celles de l’univers ;
 * - persiste uniquement les ajouts propres à un univers.
 */

import type {
  GameRuleCategory,
  GameRuleOption,
} from '@app/features/game-systems/domain/game-rule-option';

export abstract class GameRuleOptionRepository {
  abstract listForSystem(
    gameSystemId: string,
    category: GameRuleCategory,
  ): Promise<readonly GameRuleOption[]>;
  abstract listForUniverse(
    gameSystemId: string,
    universeId: string,
    category: GameRuleCategory,
  ): Promise<readonly GameRuleOption[]>;
  abstract save(option: GameRuleOption): Promise<void>;
}
