import {
  createEmptyNpcSheet,
  normalizeNpcSheet,
  type NpcSheet,
} from '@app/features/npcs/domain/npc';

export const MONSTER_SHEET_SCHEMA_VERSION = 1;
export type MonsterSheet = NpcSheet;

export type Monster = Readonly<{
  id: string;
  campaignId: string;
  name: string;
  imagePath: string | null;
  sheet: MonsterSheet;
  sheetSchemaVersion: number;
  createdAt: string;
  updatedAt: string;
}>;

export type UpdateMonsterInput = Readonly<{
  name: string;
  imagePath?: string | null;
  sheet: MonsterSheet;
}>;

export function createEmptyMonsterSheet(): MonsterSheet {
  return createEmptyNpcSheet();
}

export function createMonster(
  campaignId: string,
  input: UpdateMonsterInput,
  createId: () => string = () => crypto.randomUUID(),
  now: () => Date = () => new Date(),
): Monster {
  const timestamp = now().toISOString();
  return {
    id: createId(),
    campaignId,
    name: requiredName(input.name),
    imagePath: input.imagePath ?? null,
    sheet: normalizeNpcSheet(input.sheet),
    sheetSchemaVersion: MONSTER_SHEET_SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateMonster(
  monster: Monster,
  input: UpdateMonsterInput,
  now: () => Date = () => new Date(),
): Monster {
  return {
    ...monster,
    name: requiredName(input.name),
    imagePath: input.imagePath ?? monster.imagePath,
    sheet: normalizeNpcSheet(input.sheet),
    sheetSchemaVersion: MONSTER_SHEET_SCHEMA_VERSION,
    updatedAt: now().toISOString(),
  };
}

function requiredName(value: string): string {
  const name = value.trim();
  if (!name) throw new Error('Monster name is required.');
  return name;
}
