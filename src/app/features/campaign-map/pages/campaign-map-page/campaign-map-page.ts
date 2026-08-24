import { Component, inject, OnInit, signal } from '@angular/core';

import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import type { CampaignMap } from '@app/features/campaign-map/domain/campaign-map';
import { CampaignMapService } from '@app/features/campaign-map/application/campaign-map.service';
import { CampaignMapTree } from '@app/features/campaign-map/ui/campaign-map-tree/campaign-map-tree';

@Component({
  selector: 'app-campaign-map-page',
  imports: [CampaignMapTree],
  templateUrl: './campaign-map-page.html',
  styleUrl: './campaign-map-page.scss',
})
export class CampaignMapPage implements OnInit {
  private readonly campaignContext = inject(CampaignContext);
  private readonly campaignMapService = inject(CampaignMapService);

  protected readonly map = signal<CampaignMap | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const campaign = await this.campaignContext.load();
      if (!campaign) {
        this.error.set('Campagne introuvable.');
        return;
      }
      this.map.set(await this.campaignMapService.load(campaign));
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Impossible de construire la carte de campagne.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
