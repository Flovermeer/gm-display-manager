import type { CampaignMap } from '@app/features/campaign-map/domain/campaign-map';
import { buildVisibleCampaignMapGraph } from '@app/features/campaign-map/domain/campaign-map-graph';

describe('buildVisibleCampaignMapGraph', () => {
  it('starts with the campaign and every chapter', () => {
    const graph = buildVisibleCampaignMapGraph(map, new Set(), new Set());

    expect(graph.nodes.map(({ id }) => id)).toEqual([
      'campaign:campaign-id',
      'chapter:chapter-a',
      'chapter:chapter-b',
    ]);
    expect(graph.edges).toHaveLength(2);
  });

  it('reveals several chapter branches independently', () => {
    const graph = buildVisibleCampaignMapGraph(map, new Set(['chapter-a', 'chapter-b']), new Set());

    expect(graph.nodes.map(({ id }) => id)).toEqual([
      'campaign:campaign-id',
      'chapter:chapter-a',
      'scene:scene-a',
      'npc:npc-id',
      'item:deleted-item',
      'chapter:chapter-b',
      'scene:scene-b',
    ]);
    expect(graph.nodes.find(({ id }) => id === 'item:deleted-item')).toMatchObject({
      label: 'Ancien objet',
      available: false,
    });
  });

  it('reveals scene resources only after their scene is expanded', () => {
    const collapsed = buildVisibleCampaignMapGraph(map, new Set(['chapter-a']), new Set());
    const expanded = buildVisibleCampaignMapGraph(
      map,
      new Set(['chapter-a']),
      new Set(['scene-a']),
    );

    expect(collapsed.nodes.some(({ id }) => id === 'location:location-id')).toBe(false);
    expect(expanded.nodes.find(({ id }) => id === 'scene:scene-a')?.expanded).toBe(true);
    expect(expanded.nodes.some(({ id }) => id === 'location:location-id')).toBe(true);
    expect(expanded.edges).toContainEqual({
      id: 'edge:scene:scene-a:location:location-id',
      source: 'scene:scene-a',
      target: 'location:location-id',
      kind: 'resource',
    });
  });
});

const map: CampaignMap = {
  campaignId: 'campaign-id',
  campaignName: 'Tomb of Annihilation',
  sceneCount: 2,
  chapters: [
    {
      id: 'chapter-a',
      title: 'La porte de Baldur',
      summary: '',
      mentions: [
        { resourceType: 'npc', resourceId: 'npc-id', label: 'Syndra', available: true },
        {
          resourceType: 'item',
          resourceId: 'deleted-item',
          label: 'Ancien objet',
          available: false,
        },
      ],
      scenes: [
        {
          id: 'scene-a',
          name: 'Le port',
          summary: '',
          resources: [
            {
              resourceType: 'location',
              resourceId: 'location-id',
              label: 'Port Nyanzaru',
              available: true,
            },
          ],
        },
      ],
    },
    {
      id: 'chapter-b',
      title: 'La jungle',
      summary: '',
      mentions: [],
      scenes: [{ id: 'scene-b', name: 'Le camp', summary: '', resources: [] }],
    },
  ],
};
