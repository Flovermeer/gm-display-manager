export type GameSystem = Readonly<{
  id: string;
  name: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type GameUniverse = Readonly<{
  id: string;
  gameSystemId: string;
  name: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

const GENERIC_UNIVERSE_SUFFIX = ':generic';

export function genericUniverseId(gameSystemId: string): string {
  return `${gameSystemId}${GENERIC_UNIVERSE_SUFFIX}`;
}

export function isGenericUniverse(universe: GameUniverse): boolean {
  return universe.id === genericUniverseId(universe.gameSystemId);
}

export function genericUniverseName(gameSystemName: string): string {
  return `${gameSystemName} (générique)`;
}

export function createGameSystem(
  name: string,
  createId: () => string = () => crypto.randomUUID(),
  now: () => Date = () => new Date(),
): GameSystem {
  const timestamp = now().toISOString();
  return {
    id: createId(),
    name: requiredName(name, 'Game system'),
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createGameUniverse(
  gameSystemId: string,
  name: string,
  createId: () => string = () => crypto.randomUUID(),
  now: () => Date = () => new Date(),
): GameUniverse {
  const timestamp = now().toISOString();
  if (!gameSystemId.trim()) throw new Error('Game system is required.');
  return {
    id: createId(),
    gameSystemId,
    name: requiredName(name, 'Universe'),
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createGenericUniverse(
  gameSystem: GameSystem,
  now: () => Date = () => new Date(),
): GameUniverse {
  return createGameUniverse(
    gameSystem.id,
    genericUniverseName(gameSystem.name),
    () => genericUniverseId(gameSystem.id),
    now,
  );
}

export function renameGameSystem(
  gameSystem: GameSystem,
  name: string,
  now: () => Date = () => new Date(),
): GameSystem {
  return { ...gameSystem, name: requiredName(name, 'Game system'), updatedAt: now().toISOString() };
}

export function renameGameUniverse(
  universe: GameUniverse,
  name: string,
  now: () => Date = () => new Date(),
): GameUniverse {
  return { ...universe, name: requiredName(name, 'Universe'), updatedAt: now().toISOString() };
}

function requiredName(value: string, label: string): string {
  const name = value.trim();
  if (!name) throw new Error(`${label} name is required.`);
  return name;
}
