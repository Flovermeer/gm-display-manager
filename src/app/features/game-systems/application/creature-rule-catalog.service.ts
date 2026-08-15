/**
 * But
 * Charge en une opération les référentiels nécessaires aux fiches de créatures.
 *
 * Responsabilités
 * - retrouve le système à partir de l’univers de campagne ;
 * - compose les valeurs système et univers ;
 * - fournit un catalogue vide aux vues isolées qui n’installent pas la persistance.
 */

import { inject, Injectable } from '@angular/core';

import { GameRuleOptionRepository } from '@app/features/game-systems/data-access/game-rule-option.repository';
import { GameSystemRepository } from '@app/features/game-systems/data-access/game-system.repository';
import {
  EMPTY_CREATURE_RULE_CATALOG,
  type CreatureRuleCatalog,
} from '@app/features/game-systems/domain/creature-rule-catalog';

@Injectable({ providedIn: 'root' })
export class CreatureRuleCatalogService {
  private readonly systems = inject(GameSystemRepository, { optional: true });
  private readonly rules = inject(GameRuleOptionRepository, { optional: true });

  async loadForUniverse(universeId: string): Promise<CreatureRuleCatalog> {
    if (!this.systems || !this.rules) return EMPTY_CREATURE_RULE_CATALOG;
    const universe = await this.systems.findUniverse(universeId);
    if (!universe) throw new Error('Univers de campagne introuvable.');
    const [alignments, sizes, creatureTypes, subspecies, languages] = await Promise.all([
      this.rules.listForSystem(universe.gameSystemId, 'alignment'),
      this.rules.listForSystem(universe.gameSystemId, 'size'),
      this.rules.listForUniverse(universe.gameSystemId, universe.id, 'creature_type'),
      this.rules.listForUniverse(universe.gameSystemId, universe.id, 'creature_subspecies'),
      this.rules.listForUniverse(universe.gameSystemId, universe.id, 'language'),
    ]);
    return { alignments, sizes, creatureTypes, subspecies, languages };
  }
}
