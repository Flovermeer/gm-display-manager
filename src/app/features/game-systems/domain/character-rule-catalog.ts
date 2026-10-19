import type { GameRuleOption } from '@app/features/game-systems/domain/game-rule-option';

export type CharacterRuleCatalog = Readonly<{
  races: readonly GameRuleOption[];
  subraces: readonly GameRuleOption[];
  classes: readonly GameRuleOption[];
}>;

export const EMPTY_CHARACTER_RULE_CATALOG: CharacterRuleCatalog = {
  races: [],
  subraces: [],
  classes: [],
};

export function subracesForRace(
  catalog: CharacterRuleCatalog,
  raceOptionId: string,
): readonly GameRuleOption[] {
  return catalog.subraces.filter(({ parentOptionId }) => parentOptionId === raceOptionId);
}
