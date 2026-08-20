export const RANDOM_TABLE_ENTRY_SCHEMA_VERSION = 1;
export const RANDOM_TABLE_MAXIMUM = 100;

export type RandomTableEntry = Readonly<{
  id: string;
  minimum: number | null;
  maximum: number | null;
  resultText: string;
}>;

export type RandomTable = Readonly<{
  id: string;
  campaignId: string;
  name: string;
  description: string;
  entries: readonly RandomTableEntry[];
  createdAt: string;
  updatedAt: string;
}>;

export type RandomTableEntryInput = Readonly<{
  id?: string;
  minimum: number | null;
  maximum: number | null;
  resultText: string;
}>;

export type RandomTableInput = Readonly<{
  name: string;
  description: string;
  entries: readonly RandomTableEntryInput[];
}>;

export type RandomTableRoll = Readonly<{
  value: number;
  entry: RandomTableEntry;
}>;

export type RandomTableFactoryDependencies = Readonly<{
  createId: () => string;
  now: () => Date;
}>;

const defaultDependencies: RandomTableFactoryDependencies = {
  createId: () => crypto.randomUUID(),
  now: () => new Date(),
};

export function createRandomTable(
  campaignId: string,
  input: RandomTableInput,
  dependencies: RandomTableFactoryDependencies = defaultDependencies,
): RandomTable {
  const timestamp = dependencies.now().toISOString();
  return {
    id: dependencies.createId(),
    campaignId,
    ...normalizeRandomTableInput(input, dependencies.createId),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateRandomTable(
  table: RandomTable,
  input: RandomTableInput,
  dependencies: Pick<RandomTableFactoryDependencies, 'createId' | 'now'> = defaultDependencies,
): RandomTable {
  return {
    ...table,
    ...normalizeRandomTableInput(input, dependencies.createId),
    updatedAt: dependencies.now().toISOString(),
  };
}

export function normalizeRandomTableEntries(
  entries: readonly RandomTableEntryInput[],
  createId: () => string = () => crypto.randomUUID(),
): readonly RandomTableEntry[] {
  const normalized = entries.map((entry) => normalizeEntry(entry, createId));
  if (new Set(normalized.map(({ id }) => id)).size !== normalized.length) {
    throw new Error('Les identifiants des résultats doivent être uniques.');
  }
  return normalized
    .map((entry, index) => ({ entry, index }))
    .sort(
      (left, right) =>
        nullableOrder(left.entry.minimum, right.entry.minimum) ||
        nullableOrder(left.entry.maximum, right.entry.maximum) ||
        left.index - right.index,
    )
    .map(({ entry }) => entry);
}

export function randomTableRollIssue(table: Pick<RandomTable, 'entries'>): string | null {
  if (table.entries.length === 0) return 'Ajoute au moins un résultat avant de tirer.';
  if (
    table.entries.some(
      ({ minimum, maximum, resultText }) =>
        minimum === null || maximum === null || resultText.trim().length === 0,
    )
  ) {
    return 'Complète toutes les plages et tous les résultats avant de tirer.';
  }

  const entries = [...table.entries].sort(
    (left, right) => (left.minimum ?? Infinity) - (right.minimum ?? Infinity),
  );
  if (entries[0]?.minimum !== 1) return 'La première plage doit commencer à 1.';

  for (let index = 1; index < entries.length; index += 1) {
    const previous = entries[index - 1];
    const current = entries[index];
    if (!previous || !current || current.minimum !== (previous.maximum ?? 0) + 1) {
      return 'Les plages doivent se suivre sans trou ni chevauchement.';
    }
  }
  return null;
}

export function rollRandomTable(
  table: Pick<RandomTable, 'entries'>,
  random: () => number = secureRandomUnit,
): RandomTableRoll {
  const issue = randomTableRollIssue(table);
  if (issue) throw new Error(issue);
  const entries = [...table.entries].sort(
    (left, right) => (left.minimum ?? Infinity) - (right.minimum ?? Infinity),
  );
  const maximum = entries.at(-1)?.maximum;
  if (maximum === null || maximum === undefined) throw new Error('La table est incomplète.');
  const unit = random();
  if (!Number.isFinite(unit) || unit < 0 || unit >= 1) {
    throw new Error('La source aléatoire doit produire une valeur entre 0 inclus et 1 exclu.');
  }
  const value = Math.floor(unit * maximum) + 1;
  const entry = entries.find(
    ({ minimum, maximum: entryMaximum }) =>
      minimum !== null && entryMaximum !== null && value >= minimum && value <= entryMaximum,
  );
  if (!entry) throw new Error('Aucun résultat ne correspond au tirage.');
  return { value, entry };
}

export function randomTableRangeLabel(entry: RandomTableEntry): string {
  if (entry.minimum === null || entry.maximum === null) return 'Incomplète';
  return entry.minimum === entry.maximum ? `${entry.minimum}` : `${entry.minimum}–${entry.maximum}`;
}

function normalizeRandomTableInput(
  input: RandomTableInput,
  createId: () => string,
): Pick<RandomTable, 'name' | 'description' | 'entries'> {
  const name = input.name.trim();
  if (!name) throw new Error('Le nom de la table est obligatoire.');
  return {
    name,
    description: input.description.trim(),
    entries: normalizeRandomTableEntries(input.entries, createId),
  };
}

function normalizeEntry(entry: RandomTableEntryInput, createId: () => string): RandomTableEntry {
  const minimum = nullableBound(entry.minimum, 'La borne minimale');
  const maximum = nullableBound(entry.maximum, 'La borne maximale');
  if (minimum !== null && maximum !== null && minimum > maximum) {
    throw new Error('La borne minimale ne peut pas dépasser la borne maximale.');
  }
  return {
    id: entry.id?.trim() || createId(),
    minimum,
    maximum,
    resultText: entry.resultText.trim(),
  };
}

function nullableBound(value: number | null, label: string): number | null {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 1 || value > RANDOM_TABLE_MAXIMUM) {
    throw new Error(`${label} doit être un entier entre 1 et ${RANDOM_TABLE_MAXIMUM}.`);
  }
  return value;
}

function nullableOrder(left: number | null, right: number | null): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  return left - right;
}

function secureRandomUnit(): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return (value[0] ?? 0) / 0x1_0000_0000;
}
