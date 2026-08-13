import { inject, Injectable } from '@angular/core';

import { AppSettingRepository } from '@app/persistence/app-setting.repository';

const ACTIVE_SCENE_KEY_PREFIX = 'campaign.active_scene.';

@Injectable({ providedIn: 'root' })
export class ActiveSceneService {
  private readonly settings = inject(AppSettingRepository);

  get(campaignId: string): Promise<string | null> {
    return this.settings.get(this.key(campaignId));
  }

  set(campaignId: string, sceneId: string): Promise<void> {
    return this.settings.set(this.key(campaignId), sceneId);
  }

  clear(campaignId: string): Promise<void> {
    return this.settings.delete(this.key(campaignId));
  }

  async clearIfActive(campaignId: string, sceneId: string): Promise<boolean> {
    if ((await this.get(campaignId)) !== sceneId) return false;
    await this.clear(campaignId);
    return true;
  }

  private key(campaignId: string): string {
    return `${ACTIVE_SCENE_KEY_PREFIX}${campaignId}`;
  }
}
