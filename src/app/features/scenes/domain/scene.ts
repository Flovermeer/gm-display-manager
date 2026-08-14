export type Scene = Readonly<{
  id: string;
  campaignId: string;
  name: string;
  summary: string;
  locationId: string | null;
  npcIds: readonly string[];
  itemIds: readonly string[];
  createdAt: string;
  updatedAt: string;
}>;

export type UpdateSceneInput = Readonly<{
  name: string;
  summary: string;
  locationId: string | null;
  npcIds: readonly string[];
  itemIds: readonly string[];
}>;

export function createScene(
  campaignId: string,
  input: UpdateSceneInput,
  createId: () => string = () => crypto.randomUUID(),
  now: () => Date = () => new Date(),
): Scene {
  const timestamp = now().toISOString();
  return {
    id: createId(),
    campaignId,
    ...normalizeInput(input),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateScene(
  scene: Scene,
  input: UpdateSceneInput,
  now: () => Date = () => new Date(),
): Scene {
  return { ...scene, ...normalizeInput(input), updatedAt: now().toISOString() };
}

function normalizeInput(input: UpdateSceneInput): UpdateSceneInput {
  const name = input.name.trim();
  if (!name) throw new Error('Scene name is required.');

  return {
    name,
    summary: input.summary.trim(),
    locationId: input.locationId || null,
    npcIds: uniqueIds(input.npcIds),
    itemIds: uniqueIds(input.itemIds),
  };
}

function uniqueIds(ids: readonly string[]): readonly string[] {
  return [...new Set(ids.filter(Boolean))];
}
