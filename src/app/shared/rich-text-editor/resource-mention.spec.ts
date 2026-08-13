import type { JSONContent } from '@tiptap/core';

import { extractResourceMentions } from '@app/shared/rich-text-editor/resource-mention';

describe('resource mentions', () => {
  it('extracts unique valid relations while keeping their labels', () => {
    const mention = {
      type: 'resourceMention',
      attrs: { resourceType: 'npc', resourceId: 'npc-id', label: 'Syndra' },
    } satisfies JSONContent;
    const content: JSONContent = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [mention, { ...mention }] },
        {
          type: 'paragraph',
          content: [
            {
              type: 'resourceMention',
              attrs: { resourceType: 'location', resourceId: 'port-id', label: 'Port Nyanzaru' },
            },
          ],
        },
      ],
    };

    expect(extractResourceMentions(content)).toEqual([
      { resourceType: 'npc', resourceId: 'npc-id', label: 'Syndra' },
      { resourceType: 'location', resourceId: 'port-id', label: 'Port Nyanzaru' },
    ]);
  });
});
