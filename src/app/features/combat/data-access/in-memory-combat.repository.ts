/**
 * But
 * Conserve le combat actif en m\u00e9moire hors de Tauri.
 *
 * Responsabilit\u00e9s
 * - sert d'adaptateur navigateur et de doublure de test ;
 * - reproduit le contrat d'un combat actif unique par campagne.
 */

import { CombatRepository } from '@app/features/combat/data-access/combat.repository';
import type { ActiveCombat, Combatant } from '@app/features/combat/domain/combat';

export class InMemoryCombatRepository extends CombatRepository {
  private readonly combats = new Map<string, ActiveCombat>();

  override findActive(campaignId: string): Promise<ActiveCombat | null> {
    return Promise.resolve(this.combats.get(campaignId) ?? null);
  }

  override create(combat: ActiveCombat): Promise<void> {
    if (this.combats.has(combat.campaignId)) {
      return Promise.reject(new Error('Un combat est d\u00e9j\u00e0 actif pour cette campagne.'));
    }
    this.combats.set(combat.campaignId, combat);
    return Promise.resolve();
  }

  override saveCombatant(combat: ActiveCombat, combatant: Combatant): Promise<void> {
    const existing = this.combats.get(combat.campaignId);
    if (!existing || existing.id !== combat.id) {
      return Promise.reject(new Error('Le combat actif est introuvable.'));
    }
    this.combats.set(combat.campaignId, withoutPlayerHitPoints(combat));
    return Promise.resolve();
  }

  override removeCombatant(combat: ActiveCombat, combatantId: string): Promise<void> {
    const existing = this.combats.get(combat.campaignId);
    if (!existing || existing.id !== combat.id) {
      return Promise.reject(new Error('Le combat actif est introuvable.'));
    }
    this.combats.set(combat.campaignId, combat);
    return Promise.resolve();
  }

  override delete(campaignId: string): Promise<void> {
    this.combats.delete(campaignId);
    return Promise.resolve();
  }
}

function withoutPlayerHitPoints(combat: ActiveCombat): ActiveCombat {
  return {
    ...combat,
    combatants: combat.combatants.map((combatant) =>
      combatant.kind === 'player-character'
        ? { ...combatant, currentHitPoints: null, maxHitPoints: null }
        : combatant,
    ),
  };
}
