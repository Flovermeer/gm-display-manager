import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { MonsterService } from '@app/features/bestiary/application/monster.service';
import { CombatStore } from '@app/features/combat/application/combat.store';
import type { Combatant, CombatantSource } from '@app/features/combat/domain/combat';
import {
  monsterCombatantSource,
  npcCombatantSource,
  playerCharacterCombatantSource,
} from '@app/features/combat/domain/combatant-source';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { PlayerCharacterService } from '@app/features/players/application/player-character.service';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { FormField, type FormFieldOption } from '@app/shared/ui/form-field/form-field';

type CombatantOption = Readonly<{
  key: string;
  label: string;
  source: CombatantSource;
}>;

@Component({
  selector: 'app-combat-panel',
  imports: [ReactiveFormsModule, ButtonDirective, Dialog, FormField],
  templateUrl: './combat-panel.html',
  styleUrl: './combat-panel.scss',
})
export class CombatPanel {
  protected readonly store = inject(CombatStore);
  private readonly players = inject(PlayerCharacterService);
  private readonly npcs = inject(NpcService);
  private readonly monsters = inject(MonsterService);
  private loadVersion = 0;

  readonly campaignId = input.required<string>();

  protected readonly options = signal<readonly CombatantOption[]>([]);
  protected readonly selectedSourceKey = new FormControl('', { nonNullable: true });
  protected readonly missingMaximum = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(1),
  ]);
  protected readonly pendingRemoval = signal<Combatant | null>(null);
  protected readonly showEndConfirmation = signal(false);
  protected readonly quickAmounts = signal<Readonly<Record<string, number>>>({});
  protected readonly selectableOptions = computed<readonly FormFieldOption[]>(() => {
    const uniqueIds = new Set(
      (this.store.combat()?.combatants ?? [])
        .filter(({ kind }) => kind !== 'monster')
        .map(({ kind, resourceId }) => `${kind}:${resourceId}`),
    );
    return this.options()
      .filter(({ source, key }) => source.kind === 'monster' || !uniqueIds.has(key))
      .map(({ key, label }) => ({ value: key, label }));
  });

  constructor() {
    effect(() => {
      const campaignId = this.campaignId();
      if (this.store.isOpen()) void this.loadOptions(campaignId);
    });
    effect(() => {
      if (this.store.pendingMaximum()) this.missingMaximum.reset(null);
    });
  }

  protected async addSelected(): Promise<void> {
    const option = this.options().find(({ key }) => key === this.selectedSourceKey.value);
    if (!option) return;
    await this.store.requestAdd(option.source);
    if (!this.store.error()) this.selectedSourceKey.reset('');
  }

  protected async confirmMaximum(): Promise<void> {
    if (this.missingMaximum.invalid || this.missingMaximum.value === null) {
      this.missingMaximum.markAsTouched();
      return;
    }
    await this.store.confirmMaximum(this.missingMaximum.value);
  }

  protected updateQuickAmount(combatantId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.quickAmounts.update((amounts) => ({
      ...amounts,
      [combatantId]: Number.isSafeInteger(value) && value > 0 ? value : 1,
    }));
  }

  protected quickAmount(combatantId: string): number {
    return this.quickAmounts()[combatantId] ?? 1;
  }

  protected async applyDamage(combatant: Combatant): Promise<void> {
    await this.store.setHitPoints(
      combatant,
      (combatant.currentHitPoints ?? 0) - this.quickAmount(combatant.id),
      combatant.maxHitPoints ?? 1,
    );
  }

  protected async applyHealing(combatant: Combatant): Promise<void> {
    await this.store.setHitPoints(
      combatant,
      (combatant.currentHitPoints ?? 0) + this.quickAmount(combatant.id),
      combatant.maxHitPoints ?? 1,
    );
  }

  protected async updatePool(
    combatant: Combatant,
    currentHitPoints: number,
    maxHitPoints: number,
  ): Promise<void> {
    await this.store.setHitPoints(combatant, currentHitPoints, maxHitPoints);
  }

  protected async updateInitiative(combatant: Combatant, event: Event): Promise<void> {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    await this.store.setInitiative(combatant, Number.isSafeInteger(value) ? value : 0);
  }

  protected async renameMonster(combatant: Combatant, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.value.trim()) {
      input.value = combatant.displayName;
      return;
    }
    await this.store.renameMonster(combatant, input.value);
  }

  protected statusLabel(combatant: Combatant): string | null {
    if ((combatant.currentHitPoints ?? 1) > 0) return null;
    return combatant.kind === 'monster' ? 'Mort' : 'Hors combat';
  }

  protected kindLabel(combatant: Combatant): string {
    return { 'player-character': 'PJ', npc: 'PNJ', monster: 'Monstre' }[combatant.kind];
  }

  protected async confirmRemoval(): Promise<void> {
    const combatant = this.pendingRemoval();
    if (!combatant) return;
    await this.store.remove(combatant);
    if (!this.store.error()) this.pendingRemoval.set(null);
  }

  protected async endCombat(): Promise<void> {
    await this.store.end();
    if (!this.store.error()) this.showEndConfirmation.set(false);
  }

  private async loadOptions(campaignId: string): Promise<void> {
    const version = ++this.loadVersion;
    try {
      const [players, npcs, monsters] = await Promise.all([
        this.players.list(campaignId),
        this.npcs.list(campaignId),
        this.monsters.list(campaignId),
      ]);
      if (version !== this.loadVersion) return;
      this.options.set([
        ...players.map((character) => option(playerCharacterCombatantSource(character), 'PJ')),
        ...npcs
          .filter((npc) => npc.kind === 'character')
          .map((npc) => option(npcCombatantSource(npc), 'PNJ')),
        ...monsters.map((monster) => option(monsterCombatantSource(monster), 'Monstre')),
      ]);
    } catch (error) {
      this.store.error.set(
        error instanceof Error ? error.message : 'Impossible de charger les combattants.',
      );
    }
  }
}

function option(source: CombatantSource, prefix: string): CombatantOption {
  return {
    key: `${source.kind}:${source.resourceId}`,
    label: `${prefix} - ${source.name}`,
    source,
  };
}
