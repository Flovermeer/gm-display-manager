import type { PlayerDisplayStateOf } from '@app/features/display/domain/player-display-state';
import {
  createEmptyRichTextDocument,
  type RichTextDocument,
} from '@app/shared/rich-text-editor/rich-text-document';
import type { ResourceProvenance } from '@app/shared/domain/resource-provenance';

export const NPC_STATUSES = ['active', 'dead', 'retired', 'missing'] as const;
export const NPC_SHEET_SCHEMA_VERSION = 6 as const;

export type NpcStatus = (typeof NPC_STATUSES)[number];

export type NpcAbilityScores = Readonly<{
  strength: number | null;
  dexterity: number | null;
  constitution: number | null;
  intelligence: number | null;
  wisdom: number | null;
  charisma: number | null;
}>;

export type NpcFeature = Readonly<{
  id: string;
  name: string;
  description: RichTextDocument;
}>;

export type NpcSheet = Readonly<{
  sizeOptionId: string | null;
  size: string;
  creatureTypeOptionId: string | null;
  creatureType: string;
  creatureSubspeciesOptionId: string | null;
  creatureSubspecies: string;
  raceOptionId: string | null;
  race: string;
  subraceOptionId: string | null;
  subrace: string;
  classOptionId: string | null;
  className: string;
  occupation: string;
  alignmentOptionId: string | null;
  alignment: string;
  armorClass: number | null;
  armorClassDetails: string;
  hitPoints: number | null;
  hitPointFormula: string;
  speed: string;
  abilities: NpcAbilityScores;
  savingThrows: readonly string[];
  skills: readonly string[];
  damageVulnerabilities: readonly string[];
  damageResistances: readonly string[];
  damageImmunities: readonly string[];
  conditionImmunities: readonly string[];
  senses: readonly string[];
  languages: readonly string[];
  languageOptionIds: readonly string[];
  challengeRating: string;
  experiencePoints: number | null;
  officialDescription: RichTextDocument;
  traits: readonly NpcFeature[];
  actions: readonly NpcFeature[];
  bonusActions: readonly NpcFeature[];
  reactions: readonly NpcFeature[];
  legendaryActions: readonly NpcFeature[];
}>;

export type Npc = Readonly<{
  id: string;
  campaignId: string;
  provenance: ResourceProvenance;
  name: string;
  status: NpcStatus;
  summary: string;
  notes: string;
  portraitPath: string | null;
  idleVideoPath: string | null;
  sheet: NpcSheet;
  sheetSchemaVersion: number;
  createdAt: string;
  updatedAt: string;
}>;

export type CreateNpcInput = Readonly<{
  campaignId: string;
  name: string;
  status?: NpcStatus;
  summary?: string;
  notes?: string;
  portraitPath?: string | null;
  idleVideoPath?: string | null;
  sheet?: NpcSheet;
}>;

export type UpdateNpcInput = Readonly<{
  name: string;
  status: NpcStatus;
  summary: string;
  notes: string;
  sheet: NpcSheet;
}>;

export type NpcFactoryDependencies = Readonly<{
  createId: () => string;
  now: () => Date;
}>;

const defaultDependencies: NpcFactoryDependencies = {
  createId: () => crypto.randomUUID(),
  now: () => new Date(),
};

export function createEmptyNpcSheet(): NpcSheet {
  return {
    sizeOptionId: null,
    size: '',
    creatureTypeOptionId: null,
    creatureType: '',
    creatureSubspeciesOptionId: null,
    creatureSubspecies: '',
    raceOptionId: null,
    race: '',
    subraceOptionId: null,
    subrace: '',
    classOptionId: null,
    className: '',
    occupation: '',
    alignmentOptionId: null,
    alignment: '',
    armorClass: null,
    armorClassDetails: '',
    hitPoints: null,
    hitPointFormula: '',
    speed: '',
    abilities: {
      strength: null,
      dexterity: null,
      constitution: null,
      intelligence: null,
      wisdom: null,
      charisma: null,
    },
    savingThrows: [],
    skills: [],
    damageVulnerabilities: [],
    damageResistances: [],
    damageImmunities: [],
    conditionImmunities: [],
    senses: [],
    languages: [],
    languageOptionIds: [],
    challengeRating: '',
    experiencePoints: null,
    officialDescription: createEmptyRichTextDocument(),
    traits: [],
    actions: [],
    bonusActions: [],
    reactions: [],
    legendaryActions: [],
  };
}

export function createNpc(
  input: CreateNpcInput,
  dependencies: NpcFactoryDependencies = defaultDependencies,
): Npc {
  const name = requiredName(input.name);
  const now = dependencies.now().toISOString();

  return {
    id: dependencies.createId(),
    campaignId: input.campaignId,
    provenance: 'campaign',
    name,
    status: input.status ?? 'active',
    summary: input.summary?.trim() ?? '',
    notes: input.notes?.trim() ?? '',
    portraitPath: input.portraitPath ?? null,
    idleVideoPath: input.idleVideoPath ?? null,
    sheet: normalizeNpcSheet(input.sheet ?? createEmptyNpcSheet()),
    sheetSchemaVersion: NPC_SHEET_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateNpc(
  npc: Npc,
  input: UpdateNpcInput,
  now: () => Date = () => new Date(),
): Npc {
  return {
    ...npc,
    name: requiredName(input.name),
    status: input.status,
    summary: input.summary.trim(),
    notes: input.notes.trim(),
    sheet: normalizeNpcSheet(input.sheet),
    sheetSchemaVersion: NPC_SHEET_SCHEMA_VERSION,
    updatedAt: now().toISOString(),
  };
}

export function normalizeNpcSheet(value: unknown): NpcSheet {
  const source = isRecord(value) ? value : {};
  const abilities = isRecord(source['abilities']) ? source['abilities'] : source;
  const legacyRace = text(source['creatureSubspecies']) || text(source['creatureType']);

  return {
    sizeOptionId: nullableText(source['sizeOptionId']),
    size: text(source['size']),
    creatureTypeOptionId: nullableText(source['creatureTypeOptionId']),
    creatureType: text(source['creatureType']),
    creatureSubspeciesOptionId: nullableText(source['creatureSubspeciesOptionId']),
    creatureSubspecies: text(source['creatureSubspecies']),
    raceOptionId: nullableText(source['raceOptionId']),
    race: text(source['race']) || legacyRace,
    subraceOptionId: nullableText(source['subraceOptionId']),
    subrace: text(source['subrace']),
    classOptionId: nullableText(source['classOptionId']),
    className: text(source['className']),
    occupation: text(source['occupation']),
    alignmentOptionId: nullableText(source['alignmentOptionId']),
    alignment: text(source['alignment']),
    armorClass: nullableNonNegativeInteger(source['armorClass'], 'Armor class'),
    armorClassDetails: text(source['armorClassDetails']),
    hitPoints: nullableNonNegativeInteger(source['hitPoints'], 'Hit points'),
    hitPointFormula: text(source['hitPointFormula']),
    speed: text(source['speed']),
    abilities: {
      strength: nullableNonNegativeInteger(abilities['strength'], 'Strength'),
      dexterity: nullableNonNegativeInteger(abilities['dexterity'], 'Dexterity'),
      constitution: nullableNonNegativeInteger(abilities['constitution'], 'Constitution'),
      intelligence: nullableNonNegativeInteger(abilities['intelligence'], 'Intelligence'),
      wisdom: nullableNonNegativeInteger(abilities['wisdom'], 'Wisdom'),
      charisma: nullableNonNegativeInteger(abilities['charisma'], 'Charisma'),
    },
    savingThrows: tags(source['savingThrows']),
    skills: tags(source['skills']),
    damageVulnerabilities: tags(source['damageVulnerabilities']),
    damageResistances: tags(source['damageResistances']),
    damageImmunities: tags(source['damageImmunities']),
    conditionImmunities: tags(source['conditionImmunities']),
    senses: tags(source['senses']),
    languages: tags(source['languages']),
    languageOptionIds: tags(source['languageOptionIds']),
    challengeRating: text(source['challengeRating']),
    experiencePoints: nullableNonNegativeInteger(source['experiencePoints'], 'Experience points'),
    officialDescription: richTextDocument(source['officialDescription']),
    traits: features(source['traits']),
    actions: features(source['actions']),
    bonusActions: features(source['bonusActions']),
    reactions: features(source['reactions']),
    legendaryActions: features(source['legendaryActions']),
  };
}

function requiredName(value: string): string {
  const name = value.trim();
  if (!name) throw new Error('NPC name is required.');
  return name;
}

function nullableNonNegativeInteger(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableText(value: unknown): string | null {
  const normalized = text(value);
  return normalized || null;
}

function tags(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  return value.flatMap((candidate) => {
    const tag = text(candidate);
    const key = tag.toLocaleLowerCase('fr');
    if (!tag || unique.has(key)) return [];
    unique.add(key);
    return [tag];
  });
}

function features(value: unknown): readonly NpcFeature[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!isRecord(candidate)) return [];
    const id = text(candidate['id']);
    const name = text(candidate['name']);
    const description = candidate['description'];
    if (!id || !isRichTextDocument(description)) return [];
    return [{ id, name, description }];
  });
}

function isRichTextDocument(value: unknown): value is RichTextDocument {
  return (
    isRecord(value) &&
    value['schemaVersion'] === 1 &&
    isRecord(value['content']) &&
    value['content']['type'] === 'doc'
  );
}

function richTextDocument(value: unknown): RichTextDocument {
  return isRichTextDocument(value) ? value : createEmptyRichTextDocument();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createNpcFeature(createId: () => string = () => crypto.randomUUID()): NpcFeature {
  return { id: createId(), name: '', description: createEmptyRichTextDocument() };
}

export function npcPlayerDisplayState(
  npc: Pick<Npc, 'id' | 'name'>,
  media: Readonly<{ portraitUrl: string; idleVideoUrl?: string | null }>,
): PlayerDisplayStateOf<'npc'> {
  return {
    mode: 'npc',
    npcId: npc.id,
    name: npc.name,
    portraitPath: media.portraitUrl,
    ...(media.idleVideoUrl ? { idleVideoPath: media.idleVideoUrl } : {}),
  };
}

/** Portrait de démonstration affiché tant qu’un PNJ n’a pas de portrait enregistré. */
export const DEMO_NPC_PORTRAIT_URL = '/demo/npc-placeholder.png';

const NPC_STATUS_LABELS: Readonly<Record<NpcStatus, string>> = {
  active: 'Actif',
  dead: 'Mort',
  retired: 'Retiré',
  missing: 'Disparu',
};

const NPC_STATUS_ICONS: Readonly<Record<NpcStatus, string>> = {
  active: 'V',
  dead: '💀',
  missing: '?',
  retired: 'X',
};

export function npcStatusLabel(status: NpcStatus): string {
  return NPC_STATUS_LABELS[status];
}

export function npcStatusIcon(status: NpcStatus): string {
  return NPC_STATUS_ICONS[status];
}

/** Ligne de type de la fiche : taille, espèce, sous-espèce, classe et alignement connus. */
export function npcTypeLine(sheet: NpcSheet): string {
  return (
    [sheet.size, sheet.race, sheet.subrace, sheet.className, sheet.alignment]
      .filter(Boolean)
      .join(', ') || '—'
  );
}
