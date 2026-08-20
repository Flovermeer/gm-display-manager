/**
 * But
 * D\u00e9finit le port de persistance du combat actif d'une campagne.
 *
 * Responsabilit\u00e9s
 * - garantit un agr\u00e9gat de combat unique par campagne ;
 * - persiste les combattants temporaires sans dupliquer l'\u00e9tat des PJ.
 */

import type { ActiveCombat, Combatant } from '@app/features/combat/domain/combat';

export abstract class CombatRepository {
  abstract findActive(campaignId: string): Promise<ActiveCombat | null>;
  abstract create(combat: ActiveCombat): Promise<void>;
  abstract saveCombatant(combat: ActiveCombat, combatant: Combatant): Promise<void>;
  abstract removeCombatant(combat: ActiveCombat, combatantId: string): Promise<void>;
  abstract delete(campaignId: string): Promise<void>;
}
