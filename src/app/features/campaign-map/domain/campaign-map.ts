import type { Campaign } from '@app/features/campaigns/domain/campaign';
import type { Chapter } from '@app/features/chapters/domain/chapter';
import type { Scene } from '@app/features/scenes/domain/scene';
import {
  extractResourceMentions,
  type ResourceMentionCandidate,
  type ResourceType,
} from '@app/shared/rich-text-editor/resource-mention';

export type CampaignMapResource = Readonly<{
  resourceType: ResourceType;
  resourceId: string;
  label: string;
  available: boolean;
}>;

export type CampaignMapScene = Readonly<{
  id: string;
  name: string;
  summary: string;
  resources: readonly CampaignMapResource[];
}>;

export type CampaignMapChapter = Readonly<{
  id: string;
  title: string;
  summary: string;
  mentions: readonly CampaignMapResource[];
  scenes: readonly CampaignMapScene[];
}>;

export type CampaignMap = Readonly<{
  campaignId: string;
  campaignName: string;
  chapters: readonly CampaignMapChapter[];
  sceneCount: number;
}>;

export function buildCampaignMap(
  campaign: Campaign,
  chapters: readonly Chapter[],
  scenes: readonly Scene[],
  availableResources: readonly ResourceMentionCandidate[] = [],
): CampaignMap {
  const campaignChapters = chapters
    .filter(({ campaignId }) => campaignId === campaign.id)
    .slice()
    .sort(byPositionThenId);
  const chapterIds = new Set(campaignChapters.map(({ id }) => id));
  const campaignScenes = scenes.filter(
    ({ campaignId, chapterId }) => campaignId === campaign.id && chapterIds.has(chapterId),
  );
  const resourceIndex = new Map(
    availableResources.map((resource) => [resourceKey(resource), resource] as const),
  );

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    chapters: campaignChapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      summary: chapter.summary,
      mentions: extractResourceMentions(chapter.content.content).map((mention) => ({
        ...mention,
        available: resourceIndex.has(resourceKey(mention)),
      })),
      scenes: campaignScenes
        .filter(({ chapterId }) => chapterId === chapter.id)
        .slice()
        .sort(byPositionThenId)
        .map((scene) => ({
          id: scene.id,
          name: scene.name,
          summary: scene.summary,
          resources: sceneResources(scene, resourceIndex),
        })),
    })),
    sceneCount: campaignScenes.length,
  };
}

function sceneResources(
  scene: Scene,
  resourceIndex: ReadonlyMap<string, ResourceMentionCandidate>,
): readonly CampaignMapResource[] {
  const references: ResourceMentionCandidate[] = [];
  const append = (resourceType: ResourceType, resourceId: string | null): void => {
    if (!resourceId) return;
    const resource = resourceIndex.get(resourceKey({ resourceType, resourceId }));
    if (resource) references.push(resource);
  };

  append('location', scene.locationId);
  scene.npcIds.forEach((id) => append('npc', id));
  scene.monsterIds.forEach((id) => append('monster', id));
  scene.itemIds.forEach((id) => append('item', id));
  return references.map((resource) => ({ ...resource, available: true }));
}

function resourceKey(
  resource: Pick<ResourceMentionCandidate, 'resourceType' | 'resourceId'>,
): string {
  return `${resource.resourceType}:${resource.resourceId}`;
}

function byPositionThenId(
  left: Readonly<{ position: number; id: string }>,
  right: Readonly<{ position: number; id: string }>,
): number {
  return left.position - right.position || left.id.localeCompare(right.id);
}
