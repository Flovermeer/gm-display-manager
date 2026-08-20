export const PLAYER_CHARACTER_STATUSES = ['active', 'dead', 'retired', 'missing'] as const;

export type PlayerCharacterStatus = (typeof PLAYER_CHARACTER_STATUSES)[number];

export type PlayerCharacterSheet = Readonly<{
  species: string;
  className: string;
  level: number | null;
  armorClass: number | null;
  speed: number | null;
  passivePerception: number | null;
  passiveInsight: number | null;
  passiveInvestigation: number | null;
  senses: readonly string[];
  languages: readonly string[];
  conditions: readonly string[];
  exhaustionLevel: number;
  privateNotes: string;
}>;

export type PlayerCharacter = Readonly<{
  id: string;
  campaignId: string;
  provenance: ResourceProvenance;
  name: string;
  playerName: string;
  status: PlayerCharacterStatus;
  currentHitPoints: number | null;
  maxHitPoints: number | null;
  portraitPath: string | null;
  sheet: PlayerCharacterSheet;
  sheetSchemaVersion: number;
  createdAt: string;
  updatedAt: string;
}>;

export type UpdatePlayerCharacterInput = Readonly<{
  name: string;
  playerName: string;
  status: PlayerCharacterStatus;
  currentHitPoints: number | null;
  maxHitPoints: number | null;
  portraitPath?: string | null;
  sheet: PlayerCharacterSheet;
}>;

export type PlayerCharacterFactoryDependencies = Readonly<{
  createId: () => string;
  now: () => Date;
}>;

const defaultDependencies: PlayerCharacterFactoryDependencies = {
  createId: () => crypto.randomUUID(),
  now: () => new Date(),
};

export const EMPTY_PLAYER_CHARACTER_SHEET: PlayerCharacterSheet = {
  species: '',
  className: '',
  level: null,
  armorClass: null,
  speed: null,
  passivePerception: null,
  passiveInsight: null,
  passiveInvestigation: null,
  senses: [],
  languages: [],
  conditions: [],
  exhaustionLevel: 0,
  privateNotes: '',
};

export function createPlayerCharacter(
  campaignId: string,
  input: UpdatePlayerCharacterInput,
  dependencies: PlayerCharacterFactoryDependencies = defaultDependencies,
): PlayerCharacter {
  const now = dependencies.now().toISOString();
  const normalized = normalizeInput(input);

  return {
    id: dependencies.createId(),
    campaignId,
    provenance: 'campaign',
    ...normalized,
    portraitPath: input.portraitPath ?? null,
    sheetSchemaVersion: 2,
    createdAt: now,
    updatedAt: now,
  };
}

export function updatePlayerCharacter(
  character: PlayerCharacter,
  input: UpdatePlayerCharacterInput,
  now: () => Date = () => new Date(),
): PlayerCharacter {
  return {
    ...character,
    ...normalizeInput(input),
    portraitPath: input.portraitPath ?? character.portraitPath,
    sheetSchemaVersion: 2,
    updatedAt: now().toISOString(),
  };
}

export function updatePlayerCharacterHitPoints(
  character: PlayerCharacter,
  currentHitPoints: number,
  now: () => Date = () => new Date(),
): PlayerCharacter {
  const normalizedCurrent = nonNegativeInteger(currentHitPoints, 'Current hit points');
  assertHitPointRange(normalizedCurrent, character.maxHitPoints);

  return {
    ...character,
    currentHitPoints: normalizedCurrent,
    sheetSchemaVersion: 2,
    updatedAt: now().toISOString(),
  };
}

export function updatePlayerCharacterHitPointPool(
  character: PlayerCharacter,
  currentHitPoints: number,
  maxHitPoints: number,
  now: () => Date = () => new Date(),
): PlayerCharacter {
  const normalizedMaximum = nonNegativeInteger(maxHitPoints, 'Maximum hit points');
  const normalizedCurrent = nonNegativeInteger(currentHitPoints, 'Current hit points');
  assertHitPointRange(normalizedCurrent, normalizedMaximum);

  return {
    ...character,
    currentHitPoints: normalizedCurrent,
    maxHitPoints: normalizedMaximum,
    sheetSchemaVersion: 2,
    updatedAt: now().toISOString(),
  };
}

function normalizeInput(input: UpdatePlayerCharacterInput): UpdatePlayerCharacterInput {
  const currentHitPoints = nullableNonNegativeInteger(input.currentHitPoints, 'Current hit points');
  const maxHitPoints = nullableNonNegativeInteger(input.maxHitPoints, 'Maximum hit points');
  assertHitPointRange(currentHitPoints, maxHitPoints);

  return {
    name: requiredText(input.name, 'Character name'),
    playerName: input.playerName.trim(),
    status: input.status,
    currentHitPoints,
    maxHitPoints,
    sheet: {
      species: input.sheet.species.trim(),
      className: input.sheet.className.trim(),
      level: nullableIntegerInRange(input.sheet.level, 1, 20, 'Level'),
      armorClass: nullableNonNegativeInteger(input.sheet.armorClass, 'Armor class'),
      speed: nullableNonNegativeInteger(input.sheet.speed, 'Speed'),
      passivePerception: nullableNonNegativeInteger(
        input.sheet.passivePerception,
        'Passive perception',
      ),
      passiveInsight: nullableNonNegativeInteger(input.sheet.passiveInsight, 'Passive insight'),
      passiveInvestigation: nullableNonNegativeInteger(
        input.sheet.passiveInvestigation,
        'Passive investigation',
      ),
      senses: normalizeTags(input.sheet.senses),
      languages: normalizeTags(input.sheet.languages),
      conditions: normalizeTags(input.sheet.conditions),
      exhaustionLevel: integerInRange(input.sheet.exhaustionLevel, 0, 6, 'Exhaustion level'),
      privateNotes: input.sheet.privateNotes.trim(),
    },
  };
}

function requiredText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function nullableNonNegativeInteger(value: number | null, label: string): number | null {
  return value === null ? null : nonNegativeInteger(value, label);
}

function nonNegativeInteger(value: number, label: string): number {
  return integerInRange(value, 0, Number.MAX_SAFE_INTEGER, label);
}

function nullableIntegerInRange(
  value: number | null,
  minimum: number,
  maximum: number,
  label: string,
): number | null {
  return value === null ? null : integerInRange(value, minimum, maximum, label);
}

function integerInRange(value: number, minimum: number, maximum: number, label: string): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function assertHitPointRange(current: number | null, maximum: number | null): void {
  if (current !== null && maximum !== null && current > maximum) {
    throw new Error('Current hit points cannot exceed maximum hit points.');
  }
}

function normalizeTags(values: readonly string[]): readonly string[] {
  const unique = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const tag = value.trim();
    const key = tag.toLocaleLowerCase('fr');
    if (!tag || unique.has(key)) continue;
    unique.add(key);
    normalized.push(tag);
  }
  return normalized;
}
import type { ResourceProvenance } from '@app/shared/domain/resource-provenance';
