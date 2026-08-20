/**
 * But
 * Orchestre le combat actif et la synchronisation des PV de campagne des PJ.
 *
 * Responsabilit\u00e9s
 * - cr\u00e9e le combat au premier ajout et applique les r\u00e8gles du tracker ;
 * - maintient les PV des PJ dans leur repository d'origine.
 */

import { inject, Injectable } from '@angular/core';

import { CombatRepository } from '@app/features/combat/data-access/combat.repository';
import {
  addCombatant,
  createActiveCombat,
  removeCombatant,
  renameMonsterCombatant,
  sortCombatants,
  updateCombatantHitPoints,
  updateCombatantInitiative,
  type ActiveCombat,
  type Combatant,
  type CombatantSource,
} from '@app/features/combat/domain/combat';
import { PlayerCharacterService } from '@app/features/players/application/player-character.service';

@Injectable({ providedIn: 'root' })
export class CombatService {
  private readonly repository = inject(CombatRepository);
  private readonly playerCharacters = inject(PlayerCharacterService);

  async findActive(campaignId: string): Promise<ActiveCombat | null> {
    const combat = await this.repository.findActive(campaignId);
    return combat ? this.hydratePlayerCharacters(combat) : null;
  }

  async add(
    campaignId: string,
    source: CombatantSource,
    maximumOverride?: number,
  ): Promise<ActiveCombat> {
    let combat = await this.findActive(campaignId);
    if (!combat) {
      combat = createActiveCombat(campaignId);
      await this.repository.create(combat);
    }
    const updated = addCombatant(combat, source, maximumOverride);
    const addedId = new Set(combat.combatants.map(({ id }) => id));
    const combatant = updated.combatants.find(({ id }) => !addedId.has(id));
    if (!combatant) throw new Error('Impossible de retrouver le combattant ajout\u00e9.');
    await this.repository.saveCombatant(updated, combatant);
    return updated;
  }

  async setInitiative(
    combat: ActiveCombat,
    combatantId: string,
    initiative: number,
  ): Promise<ActiveCombat> {
    const updated = updateCombatantInitiative(combat, combatantId, initiative);
    await this.repository.saveCombatant(updated, requiredCombatant(updated, combatantId));
    return updated;
  }

  async setHitPoints(
    combat: ActiveCombat,
    combatantId: string,
    currentHitPoints: number,
    maxHitPoints: number,
  ): Promise<ActiveCombat> {
    let updated = updateCombatantHitPoints(combat, combatantId, currentHitPoints, maxHitPoints);
    const combatant = requiredCombatant(updated, combatantId);
    if (combatant.kind === 'player-character') {
      const character = await this.playerCharacters.find(combat.campaignId, combatant.resourceId);
      if (!character) throw new Error('La fiche de ce PJ est introuvable.');
      const saved = await this.playerCharacters.updateHitPointPool(
        character,
        combatant.currentHitPoints!,
        combatant.maxHitPoints!,
      );
      updated = replaceCombatant(updated, {
        ...combatant,
        currentHitPoints: saved.currentHitPoints,
        maxHitPoints: saved.maxHitPoints,
      });
      return updated;
    }
    await this.repository.saveCombatant(updated, combatant);
    return updated;
  }

  async renameMonster(
    combat: ActiveCombat,
    combatantId: string,
    displayName: string,
  ): Promise<ActiveCombat> {
    const updated = renameMonsterCombatant(combat, combatantId, displayName);
    await this.repository.saveCombatant(updated, requiredCombatant(updated, combatantId));
    return updated;
  }

  async remove(combat: ActiveCombat, combatantId: string): Promise<ActiveCombat> {
    const updated = removeCombatant(combat, combatantId);
    await this.repository.removeCombatant(updated, combatantId);
    return updated;
  }

  async end(campaignId: string): Promise<void> {
    await this.repository.delete(campaignId);
  }

  private async hydratePlayerCharacters(combat: ActiveCombat): Promise<ActiveCombat> {
    const combatants = await Promise.all(
      combat.combatants.map(async (combatant) => {
        if (combatant.kind !== 'player-character') return combatant;
        const character = await this.playerCharacters.find(combat.campaignId, combatant.resourceId);
        if (!character) return combatant;
        return {
          ...combatant,
          displayName: character.name,
          currentHitPoints: character.currentHitPoints ?? character.maxHitPoints,
          maxHitPoints: character.maxHitPoints,
        };
      }),
    );
    return { ...combat, combatants: sortCombatants(combatants) };
  }
}

function requiredCombatant(combat: ActiveCombat, id: string): Combatant {
  const combatant = combat.combatants.find((candidate) => candidate.id === id);
  if (!combatant) throw new Error('Ce combattant ne participe plus au combat.');
  return combatant;
}

function replaceCombatant(combat: ActiveCombat, combatant: Combatant): ActiveCombat {
  return {
    ...combat,
    combatants: sortCombatants(
      combat.combatants.map((candidate) => (candidate.id === combatant.id ? combatant : candidate)),
    ),
  };
}
