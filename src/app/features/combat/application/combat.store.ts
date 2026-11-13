/**
 * But
 * Porte l'\u00e9tat r\u00e9actif du panneau Combat pour le layout de campagne.
 *
 * Responsabilit\u00e9s
 * - charge et expose le combat actif persistant ;
 * - coordonne l'ouverture du panneau et les demandes de PV manquants.
 */

import { computed, inject, Injectable, signal } from '@angular/core';

import { CombatService } from '@app/features/combat/application/combat.service';
import type { ActiveCombat, Combatant, CombatantSource } from '@app/features/combat/domain/combat';
import { errorMessage } from '@app/shared/error-message';

const ERROR_FALLBACK = 'Impossible de mettre à jour le combat.';

@Injectable()
export class CombatStore {
  private readonly service = inject(CombatService);
  private campaignId: string | null = null;

  readonly combat = signal<ActiveCombat | null>(null);
  readonly isOpen = signal(false);
  readonly isBusy = signal(false);
  readonly error = signal<string | null>(null);
  readonly pendingMaximum = signal<CombatantSource | null>(null);
  readonly combatantCount = computed(() => this.combat()?.combatants.length ?? 0);

  async initialize(campaignId: string): Promise<void> {
    this.campaignId = campaignId;
    await this.run(async () => this.combat.set(await this.service.findActive(campaignId)));
  }

  toggle(): void {
    this.isOpen.update((value) => !value);
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  async requestAdd(source: CombatantSource): Promise<void> {
    this.open();
    if (source.maxHitPoints === null || source.maxHitPoints <= 0) {
      this.pendingMaximum.set(source);
      return;
    }
    await this.add(source);
  }

  async confirmMaximum(maximum: number): Promise<void> {
    const source = this.pendingMaximum();
    if (!source) return;
    await this.add(source, maximum);
    if (!this.error()) this.pendingMaximum.set(null);
  }

  cancelMaximum(): void {
    this.pendingMaximum.set(null);
  }

  async setInitiative(combatant: Combatant, initiative: number): Promise<void> {
    const combat = this.combat();
    if (!combat) return;
    await this.run(async () =>
      this.combat.set(await this.service.setInitiative(combat, combatant.id, initiative)),
    );
  }

  async setHitPoints(
    combatant: Combatant,
    currentHitPoints: number,
    maxHitPoints: number,
  ): Promise<void> {
    const combat = this.combat();
    if (!combat) return;
    await this.run(async () =>
      this.combat.set(
        await this.service.setHitPoints(combat, combatant.id, currentHitPoints, maxHitPoints),
      ),
    );
  }

  async renameMonster(combatant: Combatant, displayName: string): Promise<void> {
    const combat = this.combat();
    if (!combat) return;
    await this.run(async () =>
      this.combat.set(await this.service.renameMonster(combat, combatant.id, displayName)),
    );
  }

  async remove(combatant: Combatant): Promise<void> {
    const combat = this.combat();
    if (!combat) return;
    await this.run(async () => this.combat.set(await this.service.remove(combat, combatant.id)));
  }

  async end(): Promise<void> {
    const campaignId = this.requiredCampaignId();
    await this.run(async () => {
      await this.service.end(campaignId);
      this.combat.set(null);
      this.close();
    });
  }

  private async add(source: CombatantSource, maximum?: number): Promise<void> {
    const campaignId = this.requiredCampaignId();
    await this.run(async () =>
      this.combat.set(await this.service.add(campaignId, source, maximum)),
    );
  }

  private requiredCampaignId(): string {
    if (!this.campaignId) throw new Error('La campagne active est introuvable.');
    return this.campaignId;
  }

  private async run(action: () => Promise<void>): Promise<void> {
    if (this.isBusy()) return;
    this.isBusy.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    } finally {
      this.isBusy.set(false);
    }
  }
}
