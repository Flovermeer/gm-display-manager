import type { RichTextDocument } from '../shared/rich-text-editor/rich-text-document';

export type JournalResourceType = 'npc' | 'location' | 'player-character' | 'item' | 'scene';

export type JournalTarget = Readonly<{
  resourceType: JournalResourceType;
  resourceId: string;
}>;

export type JournalEntry = Readonly<{
  id: string;
  campaignId: string;
  target: JournalTarget | null;
  sessionAt: string;
  inGameDate: string;
  title: string;
  content: RichTextDocument;
  createdAt: string;
  updatedAt: string;
}>;

export type UpdateJournalEntryInput = Readonly<{
  sessionAt: string;
  inGameDate: string;
  title: string;
  content: RichTextDocument;
}>;

export type JournalEntryFactoryDependencies = Readonly<{
  createId: () => string;
  now: () => Date;
}>;

const defaultDependencies: JournalEntryFactoryDependencies = {
  createId: () => crypto.randomUUID(),
  now: () => new Date(),
};

export function createJournalEntry(
  campaignId: string,
  target: JournalTarget | null,
  input: UpdateJournalEntryInput,
  dependencies: JournalEntryFactoryDependencies = defaultDependencies,
): JournalEntry {
  const now = dependencies.now().toISOString();
  return {
    id: dependencies.createId(),
    campaignId,
    target,
    ...normalizeInput(input),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateJournalEntry(
  entry: JournalEntry,
  input: UpdateJournalEntryInput,
  now: () => Date = () => new Date(),
): JournalEntry {
  return { ...entry, ...normalizeInput(input), updatedAt: now().toISOString() };
}

function normalizeInput(input: UpdateJournalEntryInput): UpdateJournalEntryInput {
  const sessionAt = new Date(input.sessionAt);
  if (Number.isNaN(sessionAt.getTime())) throw new Error('Journal session date is required.');
  return {
    sessionAt: sessionAt.toISOString(),
    inGameDate: input.inGameDate.trim(),
    title: input.title.trim(),
    content: input.content,
  };
}
