import type { Campaign } from '@app/features/campaigns/domain/campaign';
import type { Chapter } from '@app/features/chapters/domain/chapter';
import type { Scene } from '@app/features/scenes/domain/scene';

export type CampaignMapScene = Readonly<{
  id: string;
  name: string;
  summary: string;
}>;

export type CampaignMapChapter = Readonly<{
  id: string;
  title: string;
  summary: string;
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
): CampaignMap {
  const campaignChapters = chapters
    .filter(({ campaignId }) => campaignId === campaign.id)
    .slice()
    .sort(byPositionThenId);
  const chapterIds = new Set(campaignChapters.map(({ id }) => id));
  const campaignScenes = scenes.filter(
    ({ campaignId, chapterId }) => campaignId === campaign.id && chapterIds.has(chapterId),
  );

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    chapters: campaignChapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      summary: chapter.summary,
      scenes: campaignScenes
        .filter(({ chapterId }) => chapterId === chapter.id)
        .slice()
        .sort(byPositionThenId)
        .map(({ id, name, summary }) => ({ id, name, summary })),
    })),
    sceneCount: campaignScenes.length,
  };
}

function byPositionThenId(
  left: Readonly<{ position: number; id: string }>,
  right: Readonly<{ position: number; id: string }>,
): number {
  return left.position - right.position || left.id.localeCompare(right.id);
}
