/**
 * But
 * Gère les dossiers média d’une campagne via Tauri.
 *
 * Responsabilités
 * - résout les emplacements applicatifs ;
 * - supprime les fichiers de campagne à la demande du service ;
 */

import { BaseDirectory, exists, remove } from '@tauri-apps/plugin-fs';

import { CampaignMediaGateway } from '@app/features/campaigns/data-access/campaign-media.gateway';

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
