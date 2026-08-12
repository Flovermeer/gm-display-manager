export const NPC_STATUSES = ['active', 'dead', 'retired', 'missing'] as const;

export type NpcStatus = (typeof NPC_STATUSES)[number];

export type Npc = Readonly<{
  id: string;
  campaignId: string;
  name: string;
  status: NpcStatus;
  summary: string;
  notes: string;
  portraitPath: string | null;
  sheet: Readonly<Record<string, unknown>>;
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
}>;

export type UpdateNpcInput = Readonly<{
  name: string;
  status: NpcStatus;
  summary: string;
  notes: string;
}>;

export type NpcFactoryDependencies = Readonly<{
  createId: () => string;
  now: () => Date;
}>;

const defaultDependencies: NpcFactoryDependencies = {
  createId: () => crypto.randomUUID(),
  now: () => new Date(),
};

export function createNpc(
  input: CreateNpcInput,
  dependencies: NpcFactoryDependencies = defaultDependencies,
): Npc {
  const name = requiredName(input.name);
  const now = dependencies.now().toISOString();

  return {
    id: dependencies.createId(),
    campaignId: input.campaignId,
    name,
    status: input.status ?? 'active',
    summary: input.summary?.trim() ?? '',
    notes: input.notes?.trim() ?? '',
    portraitPath: input.portraitPath ?? null,
    sheet: {},
    sheetSchemaVersion: 1,
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
    updatedAt: now().toISOString(),
  };
}

function requiredName(value: string): string {
  const name = value.trim();
  if (!name) {
    throw new Error('NPC name is required.');
  }

  return name;
}
