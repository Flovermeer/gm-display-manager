import {
  createEmptyRichTextDocument,
  type RichTextDocument,
} from '@app/shared/rich-text-editor/rich-text-document';

export type Chapter = Readonly<{
  id: string;
  campaignId: string;
  title: string;
  summary: string;
  content: RichTextDocument;
  position: number;
  createdAt: string;
  updatedAt: string;
}>;

export type UpdateChapterInput = Readonly<{
  title: string;
  summary: string;
  content: RichTextDocument;
}>;

export type ChapterFactoryDependencies = Readonly<{
  createId: () => string;
  now: () => Date;
}>;

const defaultDependencies: ChapterFactoryDependencies = {
  createId: () => crypto.randomUUID(),
  now: () => new Date(),
};

export function createChapter(
  campaignId: string,
  position: number,
  input: UpdateChapterInput,
  dependencies: ChapterFactoryDependencies = defaultDependencies,
): Chapter {
  const now = dependencies.now().toISOString();
  return {
    id: dependencies.createId(),
    campaignId,
    title: requiredTitle(input.title),
    summary: input.summary.trim(),
    content: input.content,
    position: Math.max(0, Math.trunc(position)),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateChapter(
  chapter: Chapter,
  input: UpdateChapterInput,
  now: () => Date = () => new Date(),
): Chapter {
  return {
    ...chapter,
    title: requiredTitle(input.title),
    summary: input.summary.trim(),
    content: input.content,
    updatedAt: now().toISOString(),
  };
}

export function emptyChapterInput(): UpdateChapterInput {
  return { title: '', summary: '', content: createEmptyRichTextDocument() };
}

function requiredTitle(value: string): string {
  const title = value.trim();
  if (!title) throw new Error('Chapter title is required.');
  return title;
}
