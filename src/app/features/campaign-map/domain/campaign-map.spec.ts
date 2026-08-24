import type { Campaign } from '@app/features/campaigns/domain/campaign';
import type { Chapter } from '@app/features/chapters/domain/chapter';
import { RICH_TEXT_SCHEMA_VERSION } from '@app/shared/rich-text-editor/rich-text-document';
import type { Scene } from '@app/features/scenes/domain/scene';
import { buildCampaignMap } from '@app/features/campaign-map/domain/campaign-map';

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
});

const campaign: Campaign = {
  id: 'campaign-id',
  name: 'Tomb of Annihilation',
  description: '',
  universeId: 'forgotten-realms',
  createdAt: '2026-08-24T08:00:00.000Z',
  updatedAt: '2026-08-24T08:00:00.000Z',
};

function chapter(id: string, position: number, campaignId = campaign.id): Chapter {
  return {
    id,
    campaignId,
    title: id,
    summary: '',
    content: {
      schemaVersion: RICH_TEXT_SCHEMA_VERSION,
      content: { type: 'doc', content: [] },
    },
    position,
    createdAt: '2026-08-24T08:00:00.000Z',
    updatedAt: '2026-08-24T08:00:00.000Z',
  };
}

function scene(id: string, chapterId: string, position: number, campaignId = campaign.id): Scene {
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
  };
}
