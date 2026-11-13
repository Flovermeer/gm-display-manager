import {
  createEmptyNpcSheet,
  normalizeNpcSheet,
  type NpcSheet,
} from '@app/features/npcs/domain/npc';
import type { ResourceProvenance } from '@app/shared/domain/resource-provenance';

export const MONSTER_SHEET_SCHEMA_VERSION = 1;
export type MonsterSheet = NpcSheet;

export type Monster = Readonly<{
  id: string;
  campaignId: string;
  provenance: ResourceProvenance;
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
    provenance: 'campaign',
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

/** Ligne de type du bloc de statistiques : taille, type et alignement connus. */
export function monsterTypeLine(
  sheet: Pick<MonsterSheet, 'size' | 'creatureType' | 'alignment'>,
): string {
  return (
    [sheet.size, sheet.creatureType, sheet.alignment].filter(Boolean).join(', ') ||
    'Type non renseigné'
  );
}
