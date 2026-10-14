import {
  createEmptyRichTextDocument,
  type RichTextDocument,
} from '@app/shared/rich-text-editor/rich-text-document';

export type Scene = Readonly<{
  id: string;
  campaignId: string;
  chapterId: string;
  position: number;
  name: string;
  summary: string;
  description: RichTextDocument;
  locationId: string | null;
  npcIds: readonly string[];
  monsterIds: readonly string[];
  itemIds: readonly string[];
  createdAt: string;
  updatedAt: string;
}>;

export type UpdateSceneInput = Readonly<{
  name: string;
  summary: string;
  description: RichTextDocument;
  locationId: string | null;
  npcIds: readonly string[];
  monsterIds: readonly string[];
  itemIds: readonly string[];
}>;

export function createScene(
  campaignId: string,
  chapterId: string,
  position: number,
  input: UpdateSceneInput,
  createId: () => string = () => crypto.randomUUID(),
  now: () => Date = () => new Date(),
): Scene {
  const timestamp = now().toISOString();
  return {
    id: createId(),
    campaignId,
    chapterId: requiredChapterId(chapterId),
    position: normalizePosition(position),
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

export function moveSceneToChapter(
  scene: Scene,
  chapterId: string,
  position: number,
  now: () => Date = () => new Date(),
): Scene {
  return {
    ...scene,
    chapterId: requiredChapterId(chapterId),
    position: normalizePosition(position),
    updatedAt: now().toISOString(),
  };
}

function normalizeInput(input: UpdateSceneInput): UpdateSceneInput {
  const name = input.name.trim();
  if (!name) throw new Error('Scene name is required.');

  return {
    name,
    summary: input.summary.trim(),
    description: input.description,
    locationId: input.locationId || null,
    npcIds: uniqueIds(input.npcIds),
    monsterIds: uniqueIds(input.monsterIds),
    itemIds: uniqueIds(input.itemIds),
  };
}

export function emptySceneInput(): UpdateSceneInput {
  return {
    name: '',
    summary: '',
    description: createEmptyRichTextDocument(),
    locationId: null,
    npcIds: [],
    monsterIds: [],
    itemIds: [],
  };
}

function uniqueIds(ids: readonly string[]): readonly string[] {
  return [...new Set(ids.filter(Boolean))];
}

function requiredChapterId(value: string): string {
  const chapterId = value.trim();
  if (!chapterId) throw new Error('Scene chapter is required.');
  return chapterId;
}

function normalizePosition(value: number): number {
  return Math.max(0, Math.trunc(value));
}
