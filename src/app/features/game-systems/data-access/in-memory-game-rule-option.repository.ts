/**
 * But
 * Fournit les référentiels de règles hors de Tauri.
 *
 * Responsabilités
 * - sert d’adaptateur navigateur et de doublure de test ;
 * - reproduit la fusion système/univers du repository SQLite.
 */

import { GameRuleOptionRepository } from '@app/features/game-systems/data-access/game-rule-option.repository';
import type {
  GameRuleCategory,
  GameRuleOption,
} from '@app/features/game-systems/domain/game-rule-option';

export class InMemoryGameRuleOptionRepository extends GameRuleOptionRepository {
  private readonly options = new Map<string, GameRuleOption>();

  override listForSystem(
    gameSystemId: string,
    category: GameRuleCategory,
  ): Promise<readonly GameRuleOption[]> {
    return Promise.resolve(this.select(gameSystemId, category, null));
  }

  override listForUniverse(
    gameSystemId: string,
    universeId: string,
    category: GameRuleCategory,
  ): Promise<readonly GameRuleOption[]> {
    return Promise.resolve(
      this.select(gameSystemId, category).filter(
        ({ universeId: scope }) => scope === null || scope === universeId,
      ),
    );
  }

  override save(option: GameRuleOption): Promise<void> {
    const duplicate = [...this.options.values()].some(
      (candidate) =>
        candidate.id !== option.id &&
        candidate.gameSystemId === option.gameSystemId &&
        candidate.universeId === option.universeId &&
        candidate.category === option.category &&
        candidate.code.toLocaleLowerCase('fr') === option.code.toLocaleLowerCase('fr'),
    );
    if (duplicate) return Promise.reject(new Error('Cette valeur existe déjà.'));
    this.options.set(option.id, option);
    return Promise.resolve();
  }

  private select(
    gameSystemId: string,
    category: GameRuleCategory,
    universeId?: string | null,
  ): readonly GameRuleOption[] {
    return [...this.options.values()]
      .filter(
        (option) =>
          option.gameSystemId === gameSystemId &&
          option.category === category &&
          (universeId === undefined || option.universeId === universeId),
      )
      .sort(
        (left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id),
      );
  }
}
