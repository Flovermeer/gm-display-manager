import { BaseDirectory, exists, remove } from '@tauri-apps/plugin-fs';

import { CampaignMediaGateway } from './campaign-media.gateway';

export class TauriCampaignMediaGateway extends CampaignMediaGateway {
  override async discardCampaign(campaignId: string): Promise<void> {
    assertSafePathSegment(campaignId);
    const relativePath = `campaigns/${campaignId}`;
    const options = { baseDir: BaseDirectory.AppData } as const;
    if (await exists(relativePath, options)) {
      await remove(relativePath, { ...options, recursive: true });
    }
  }
}

function assertSafePathSegment(value: string): void {
  if (!/^[a-zA-Z0-9-]+$/.test(value)) {
    throw new Error('Invalid campaign identifier.');
  }
}
