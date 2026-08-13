import type { JSONContent } from '@tiptap/core';

export const RICH_TEXT_SCHEMA_VERSION = 1 as const;

export type RichTextDocument = {
  schemaVersion: typeof RICH_TEXT_SCHEMA_VERSION;
  content: JSONContent;
};

export function createEmptyRichTextDocument(): RichTextDocument {
  return {
    schemaVersion: RICH_TEXT_SCHEMA_VERSION,
    content: {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    },
  };
}
