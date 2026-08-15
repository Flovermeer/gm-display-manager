import type { GameRuleOption } from '@app/features/game-systems/domain/game-rule-option';

export type CreatureRuleCatalog = Readonly<{
  alignments: readonly GameRuleOption[];
  sizes: readonly GameRuleOption[];
  creatureTypes: readonly GameRuleOption[];
  subspecies: readonly GameRuleOption[];
  languages: readonly GameRuleOption[];
}>;

export const EMPTY_CREATURE_RULE_CATALOG: CreatureRuleCatalog = {
  alignments: [],
  sizes: [],
  creatureTypes: [],
  subspecies: [],
  languages: [],
};

export function optionIdFor(
  currentId: string | null,
  legacyLabel: string,
  options: readonly GameRuleOption[],
): string {
  if (currentId && options.some(({ id }) => id === currentId)) return currentId;
  const normalized = legacyLabel.trim().toLocaleLowerCase('fr');
  return (
    options.find(
      ({ label, code }) =>
        label.toLocaleLowerCase('fr') === normalized || code.toLocaleLowerCase('fr') === normalized,
    )?.id ?? ''
  );
}

export function optionLabel(id: string, options: readonly GameRuleOption[], fallback = ''): string {
  return options.find((option) => option.id === id)?.label ?? fallback;
}
