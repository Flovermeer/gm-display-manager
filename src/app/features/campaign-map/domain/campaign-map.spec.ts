import type { JSONContent } from '@tiptap/core';

import type { Campaign } from '@app/features/campaigns/domain/campaign';
import type { Chapter } from '@app/features/chapters/domain/chapter';
import { RICH_TEXT_SCHEMA_VERSION } from '@app/shared/rich-text-editor/rich-text-document';
import type { Scene } from '@app/features/scenes/domain/scene';
import { buildCampaignMap } from '@app/features/campaign-map/domain/campaign-map';
import type { ResourceMentionCandidate } from '@app/shared/rich-text-editor/resource-mention';

describe('buildCampaignMap', () => {
  it('orders chapters and scenes while excluding foreign and orphaned data', () => {
    const chapters = [
      chapter('chapter-b', 1),
      chapter('chapter-a', 0),
      chapter('foreign', 0, 'other'),
    ];
    const scenes = [
      scene('scene-b', 'chapter-a', 1),
      scene('scene-a', 'chapter-a', 0),
      scene('orphan', 'missing', 0),
      scene('foreign', 'foreign', 0, 'other'),
    ];

    const map = buildCampaignMap(campaign, chapters, scenes);

    expect(map.campaignName).toBe('Tomb of Annihilation');
    expect(map.chapters.map(({ id }) => id)).toEqual(['chapter-a', 'chapter-b']);
    expect(map.chapters[0]?.scenes.map(({ id }) => id)).toEqual(['scene-a', 'scene-b']);
    expect(map.sceneCount).toBe(2);
  });

  it('derives scene resources and chapter mentions while preserving broken labels', () => {
    const chapters = [
      chapter('chapter-a', 0, campaign.id, [
        mention('npc', 'npc-id', 'Syndra Silvane'),
        mention('item', 'missing-item', 'Objet disparu'),
      ]),
    ];
    const scenes = [
      scene('scene-a', 'chapter-a', 0, campaign.id, {
        locationId: 'location-id',
        npcIds: ['npc-id', 'missing-npc'],
        monsterIds: ['monster-id'],
        itemIds: ['item-id'],
      }),
    ];
    const resources: ResourceMentionCandidate[] = [
      candidate('location', 'location-id', 'Port Nyanzaru'),
      candidate('npc', 'npc-id', 'Syndra Silvane'),
      candidate('monster', 'monster-id', 'Zombie'),
      candidate('item', 'item-id', 'Carte au trésor'),
    ];

    const map = buildCampaignMap(campaign, chapters, scenes, resources);

    expect(map.chapters[0]?.mentions).toEqual([
      { ...candidate('npc', 'npc-id', 'Syndra Silvane'), available: true },
      { ...candidate('item', 'missing-item', 'Objet disparu'), available: false },
    ]);
    expect(map.chapters[0]?.scenes[0]?.resources).toEqual(
      resources.map((resource) => ({ ...resource, available: true })),
    );
  });
});

const campaign: Campaign = {
  id: 'campaign-id',
  name: 'Tomb of Annihilation',
  description: '',
  universeId: 'forgotten-realms',
  createdAt: '2026-08-24T08:00:00.000Z',
  updatedAt: '2026-08-24T08:00:00.000Z',
};

function chapter(
  id: string,
  position: number,
  campaignId = campaign.id,
  content: JSONContent[] = [],
): Chapter {
  return {
    id,
    campaignId,
    title: id,
    summary: '',
    content: {
      schemaVersion: RICH_TEXT_SCHEMA_VERSION,
      content: { type: 'doc', content },
    },
    position,
    createdAt: '2026-08-24T08:00:00.000Z',
    updatedAt: '2026-08-24T08:00:00.000Z',
  };
}

function scene(
  id: string,
  chapterId: string,
  position: number,
  campaignId = campaign.id,
  overrides: Partial<Scene> = {},
): Scene {
  return {
    id,
    campaignId,
    chapterId,
    position,
    name: id,
    summary: '',
    locationId: null,
    npcIds: [],
    monsterIds: [],
    itemIds: [],
    createdAt: '2026-08-24T08:00:00.000Z',
    updatedAt: '2026-08-24T08:00:00.000Z',
    ...overrides,
  };
}

function candidate(
  resourceType: ResourceMentionCandidate['resourceType'],
  resourceId: string,
  label: string,
): ResourceMentionCandidate {
  return { resourceType, resourceId, label };
}

function mention(
  resourceType: ResourceMentionCandidate['resourceType'],
  resourceId: string,
  label: string,
): JSONContent {
  return {
    type: 'paragraph',
    content: [{ type: 'resourceMention', attrs: { resourceType, resourceId, label } }],
  };
}
