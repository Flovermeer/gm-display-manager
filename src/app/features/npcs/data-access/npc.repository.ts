/**
 * But
 * Définit le port de persistance des PNJ.
 *
 * Responsabilités
 * - expose les opérations attendues par NpcService ;
 * - ne dépend ni de SQLite ni de Tauri ;
 */

import type { Npc } from '@app/features/npcs/domain/npc';

export abstract class NpcRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly Npc[]>;
  abstract findById(campaignId: string, id: string): Promise<Npc | null>;
  abstract save(npc: Npc): Promise<void>;
  abstract delete(campaignId: string, id: string): Promise<void>;
}
