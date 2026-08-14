/**
 * But
 * Expose la campagne portée par la route courante aux pages enfants.
 *
 * Responsabilités
 * - charge et active une seule fois la campagne demandée ;
 * - partage son état réactif dans le layout de campagne ;
 */

import { inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import type { Campaign } from '@app/features/campaigns/domain/campaign';
import { CampaignService } from '@app/features/campaigns/application/campaign.service';

@Injectable({ providedIn: 'root' })
export class CampaignContext {
  private readonly campaignService = inject(CampaignService);
  private readonly route = inject(ActivatedRoute);
  private loadPromise?: Promise<Campaign | null>;

  readonly campaign = signal<Campaign | null>(null);

  load(): Promise<Campaign | null> {
    this.loadPromise ??= this.loadCampaign().catch((error: unknown) => {
      this.loadPromise = undefined;
      throw error;
    });
    return this.loadPromise;
  }

  private async loadCampaign(): Promise<Campaign | null> {
    const campaignId = this.route.snapshot.paramMap.get('campaignId');
    if (!campaignId) return null;
    const campaign = await this.campaignService.findById(campaignId);
    if (!campaign) return null;
    await this.campaignService.activate(campaign.id);
    this.campaign.set(campaign);
    return campaign;
  }
}
