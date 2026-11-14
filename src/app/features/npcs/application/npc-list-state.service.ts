/**
 * But
 * Mémorise les groupes repliés (Organisation, PNJ) de la liste des PNJ pour chaque campagne.
 *
 * Responsabilités
 * - sérialise les types repliés dans les préférences locales de l'application ;
 * - isole les campagnes et ignore les données de préférence invalides.
 */

import { inject, Injectable } from '@angular/core';

import { AppSettingRepository } from '@app/core/persistence/app-setting.repository';
import { NPC_KINDS, type NpcKind } from '@app/features/npcs/domain/npc';

const COLLAPSED_NPC_GROUPS_KEY_PREFIX = 'campaign.npcs.collapsed.';

@Injectable({ providedIn: 'root' })
export class NpcListStateService {
  private readonly settings = inject(AppSettingRepository);

  async load(campaignId: string): Promise<ReadonlySet<NpcKind>> {
    const serializedKinds = await this.settings.get(this.key(campaignId));
    if (!serializedKinds) return new Set();

    try {
      const kinds: unknown = JSON.parse(serializedKinds);
      return Array.isArray(kinds) ? new Set(kinds.filter(isNpcKind)) : new Set();
    } catch {
      return new Set();
    }
  }

  save(campaignId: string, collapsedKinds: ReadonlySet<NpcKind>): Promise<void> {
    const key = this.key(campaignId);
    if (collapsedKinds.size === 0) return this.settings.delete(key);
    return this.settings.set(key, JSON.stringify([...collapsedKinds].sort()));
  }

  private key(campaignId: string): string {
    return `${COLLAPSED_NPC_GROUPS_KEY_PREFIX}${campaignId}`;
  }
}

function isNpcKind(value: unknown): value is NpcKind {
  return typeof value === 'string' && NPC_KINDS.includes(value as NpcKind);
}
