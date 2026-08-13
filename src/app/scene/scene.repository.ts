import type { Scene } from '@app/scene/scene';

export abstract class SceneRepository {
  abstract listByCampaign(campaignId: string): Promise<readonly Scene[]>;
  abstract findById(campaignId: string, id: string): Promise<Scene | null>;
  abstract save(scene: Scene): Promise<void>;
  abstract delete(campaignId: string, id: string): Promise<void>;
}
