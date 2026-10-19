/**
 * But
 * Définit le port de lecture et d’enrichissement des référentiels de règles.
 *
 * Responsabilités
 * - fusionne les valeurs natives et propres à l’univers ;
 * - ajoute l’héritage du catalogue générique pour les espèces, sous-espèces et classes ;
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
  abstract remove(option: GameRuleOption): Promise<boolean>;
}
