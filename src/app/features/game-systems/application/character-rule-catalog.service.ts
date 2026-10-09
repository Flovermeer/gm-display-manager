/**
 * But
 * Charge les référentiels d'identité partagés par les PJ et les PNJ.
 *
 * Responsabilités
 * - retrouve le système à partir de l'univers de campagne ;
 * - fournit les races et classes configurées pour cet univers.
 */

import { inject, Injectable } from '@angular/core';

import { GameRuleOptionRepository } from '@app/features/game-systems/data-access/game-rule-option.repository';
import { GameSystemRepository } from '@app/features/game-systems/data-access/game-system.repository';
import {
  EMPTY_CHARACTER_RULE_CATALOG,
  type CharacterRuleCatalog,
} from '@app/features/game-systems/domain/character-rule-catalog';

@Injectable({ providedIn: 'root' })
export class CharacterRuleCatalogService {
  private readonly systems = inject(GameSystemRepository, { optional: true });
  private readonly rules = inject(GameRuleOptionRepository, { optional: true });

  async loadForUniverse(universeId: string): Promise<CharacterRuleCatalog> {
    if (!this.systems || !this.rules) return EMPTY_CHARACTER_RULE_CATALOG;
    const universe = await this.systems.findUniverse(universeId);
    if (!universe) throw new Error('Univers de campagne introuvable.');
    const [races, classes] = await Promise.all([
      this.rules.listForUniverse(universe.gameSystemId, universe.id, 'race'),
      this.rules.listForUniverse(universe.gameSystemId, universe.id, 'class'),
    ]);
    return { races, classes };
  }
}
