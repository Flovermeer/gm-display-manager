import type { GameRuleOption } from '@app/features/game-systems/domain/game-rule-option';

export type CharacterRuleCatalog = Readonly<{
  races: readonly GameRuleOption[];
  classes: readonly GameRuleOption[];
}>;

export const EMPTY_CHARACTER_RULE_CATALOG: CharacterRuleCatalog = {
  races: [],
  classes: [],
};
