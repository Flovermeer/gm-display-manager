import type { JSONContent } from '@tiptap/core';

import {
  extractResourceMentions,
  resourceRouteSegment,
  resourceTypeLabel,
} from '@app/shared/rich-text-editor/resource-mention';

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
        {
          type: 'paragraph',
          content: [
            {
              type: 'resourceMention',
              attrs: { resourceType: 'monster', resourceId: 'atropal-id', label: 'Atropal' },
            },
          ],
        },
      ],
    };

    expect(extractResourceMentions(content)).toEqual([
      { resourceType: 'npc', resourceId: 'npc-id', label: 'Syndra' },
      { resourceType: 'location', resourceId: 'port-id', label: 'Port Nyanzaru' },
      { resourceType: 'monster', resourceId: 'atropal-id', label: 'Atropal' },
    ]);
  });

  it('centralizes resource labels and route segments', () => {
    expect(resourceTypeLabel('player-character')).toBe('PJ');
    expect(resourceTypeLabel('monster')).toBe('Monstre');
    expect(resourceRouteSegment('scene')).toBe('scenes');
    expect(resourceRouteSegment('monster')).toBe('bestiary');
  });
});
