export const COMBATANT_KINDS = ['player-character', 'npc', 'monster'] as const;

export type CombatantKind = (typeof COMBATANT_KINDS)[number];

export type Combatant = Readonly<{
  id: string;
  combatId: string;
  kind: CombatantKind;
  resourceId: string;
  displayName: string;
  initiative: number;
  currentHitPoints: number | null;
  maxHitPoints: number | null;
  addedOrder: number;
  createdAt: string;
  updatedAt: string;
}>;

export type ActiveCombat = Readonly<{
  id: string;
  campaignId: string;
  startedAt: string;
  updatedAt: string;
  combatants: readonly Combatant[];
}>;

export type CombatantSource = Readonly<{
  kind: CombatantKind;
  resourceId: string;
  name: string;
  currentHitPoints: number | null;
  maxHitPoints: number | null;
}>;

export type CombatFactoryDependencies = Readonly<{
  createId: () => string;
  now: () => Date;
}>;

const defaultDependencies: CombatFactoryDependencies = {
  createId: () => crypto.randomUUID(),
  now: () => new Date(),
};

export function createActiveCombat(
  campaignId: string,
  dependencies: CombatFactoryDependencies = defaultDependencies,
): ActiveCombat {
  const timestamp = dependencies.now().toISOString();
  return {
    id: dependencies.createId(),
    campaignId,
    startedAt: timestamp,
    updatedAt: timestamp,
    combatants: [],
  };
}

export function addCombatant(
  combat: ActiveCombat,
  source: CombatantSource,
  maximumOverride?: number,
  dependencies: CombatFactoryDependencies = defaultDependencies,
): ActiveCombat {
  if (
    source.kind !== 'monster' &&
    combat.combatants.some(
      ({ kind, resourceId }) => kind === source.kind && resourceId === source.resourceId,
    )
  ) {
    throw new Error('Ce combattant participe d\u00e9j\u00e0 ce combat.');
  }
  const maxHitPoints = positiveInteger(maximumOverride ?? source.maxHitPoints, 'PV maximum');
  const currentHitPoints = clamp(source.currentHitPoints ?? maxHitPoints, 0, maxHitPoints);
  const timestamp = dependencies.now().toISOString();
  const combatant: Combatant = {
    id: dependencies.createId(),
    combatId: combat.id,
    kind: source.kind,
    resourceId: source.resourceId,
    displayName:
      source.kind === 'monster'
        ? monsterInstanceName(combat.combatants, source.resourceId, source.name)
        : requiredName(source.name),
    initiative: 0,
    currentHitPoints,
    maxHitPoints,
    addedOrder: Math.max(-1, ...combat.combatants.map(({ addedOrder }) => addedOrder)) + 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return touch(combat, [...combat.combatants, combatant], timestamp);
}

export function updateCombatantInitiative(
  combat: ActiveCombat,
  combatantId: string,
  initiative: number,
  now: () => Date = () => new Date(),
): ActiveCombat {
  return updateCombatant(combat, combatantId, now, (combatant) => ({
    ...combatant,
    initiative: integer(initiative, 'Initiative'),
  }));
}

export function updateCombatantHitPoints(
  combat: ActiveCombat,
  combatantId: string,
  currentHitPoints: number,
  maxHitPoints: number,
  now: () => Date = () => new Date(),
): ActiveCombat {
  const maximum = positiveInteger(maxHitPoints, 'PV maximum');
  return updateCombatant(combat, combatantId, now, (combatant) => ({
    ...combatant,
    currentHitPoints: clamp(integer(currentHitPoints, 'PV actuels'), 0, maximum),
    maxHitPoints: maximum,
  }));
}

export function renameMonsterCombatant(
  combat: ActiveCombat,
  combatantId: string,
  displayName: string,
  now: () => Date = () => new Date(),
): ActiveCombat {
  return updateCombatant(combat, combatantId, now, (combatant) => {
    if (combatant.kind !== 'monster')
      throw new Error('Seuls les monstres peuvent \u00eatre renomm\u00e9s.');
    return { ...combatant, displayName: requiredName(displayName) };
  });
}

export function removeCombatant(
  combat: ActiveCombat,
  combatantId: string,
  now: () => Date = () => new Date(),
): ActiveCombat {
  if (!combat.combatants.some(({ id }) => id === combatantId)) {
    throw new Error('Ce combattant ne participe plus au combat.');
  }
  const timestamp = now().toISOString();
  return touch(
    combat,
    combat.combatants.filter(({ id }) => id !== combatantId),
    timestamp,
  );
}

export function sortCombatants(combatants: readonly Combatant[]): readonly Combatant[] {
  return [...combatants].sort(
    (left, right) =>
      right.initiative - left.initiative ||
      kindRank(left.kind) - kindRank(right.kind) ||
      left.addedOrder - right.addedOrder,
  );
}

function updateCombatant(
  combat: ActiveCombat,
  combatantId: string,
  now: () => Date,
  update: (combatant: Combatant) => Combatant,
): ActiveCombat {
  const timestamp = now().toISOString();
  let found = false;
  const combatants = combat.combatants.map((combatant) => {
    if (combatant.id !== combatantId) return combatant;
    found = true;
    return { ...update(combatant), updatedAt: timestamp };
  });
  if (!found) throw new Error('Ce combattant ne participe plus au combat.');
  return touch(combat, combatants, timestamp);
}

function touch(
  combat: ActiveCombat,
  combatants: readonly Combatant[],
  updatedAt: string,
): ActiveCombat {
  return { ...combat, updatedAt, combatants: sortCombatants(combatants) };
}

function monsterInstanceName(
  combatants: readonly Combatant[],
  resourceId: string,
  name: string,
): string {
  const instance =
    combatants.filter(
      ({ kind, resourceId: existingId }) => kind === 'monster' && existingId === resourceId,
    ).length + 1;
  return `${requiredName(name)} ${instance}`;
}

function kindRank(kind: CombatantKind): number {
  return { 'player-character': 0, npc: 1, monster: 2 }[kind];
}

function requiredName(value: string): string {
  const name = value.trim();
  if (!name) throw new Error('Le nom du combattant est obligatoire.');
  return name;
}

function positiveInteger(value: number | null, label: string): number {
  const normalized = integer(value, label);
  if (normalized <= 0) throw new Error(`${label} doit \u00eatre sup\u00e9rieur \u00e0 z\u00e9ro.`);
  return normalized;
}

function integer(value: number | null, label: string): number {
  if (value === null || !Number.isSafeInteger(value)) throw new Error(`${label} est invalide.`);
  return value;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
