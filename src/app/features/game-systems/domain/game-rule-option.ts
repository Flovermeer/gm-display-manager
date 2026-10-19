export const GAME_RULE_CATEGORIES = [
  'alignment',
  'size',
  'creature_type',
  'creature_subspecies',
  'language',
  'race',
  'subrace',
  'class',
] as const;

export type GameRuleCategory = (typeof GAME_RULE_CATEGORIES)[number];

export type GameRuleOption = Readonly<{
  id: string;
  gameSystemId: string;
  universeId: string | null;
  category: GameRuleCategory;
  parentOptionId: string | null;
  code: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}>;

export function createUniverseRuleOption(
  gameSystemId: string,
  universeId: string,
  category: Extract<
    GameRuleCategory,
    'creature_type' | 'creature_subspecies' | 'language' | 'race' | 'subrace' | 'class'
  >,
  label: string,
  parentOptionId: string | null = null,
  createId: () => string = () => crypto.randomUUID(),
  now: () => Date = () => new Date(),
): GameRuleOption {
  const normalizedLabel = label.trim();
  if (!gameSystemId.trim() || !universeId.trim())
    throw new Error('Le système et l’univers sont requis.');
  if (!normalizedLabel) throw new Error('Le libellé est requis.');
  if ((category === 'creature_subspecies' || category === 'subrace') && !parentOptionId) {
    throw new Error('Une sous-espèce doit être rattachée à une espèce ou un type.');
  }
  const timestamp = now().toISOString();
  return {
    id: createId(),
    gameSystemId,
    universeId,
    category,
    parentOptionId:
      category === 'creature_subspecies' || category === 'subrace' ? parentOptionId : null,
    code: slug(normalizedLabel),
    label: normalizedLabel,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
