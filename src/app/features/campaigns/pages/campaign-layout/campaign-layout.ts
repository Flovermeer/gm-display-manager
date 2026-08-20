import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { CampaignNavigation } from '@app/features/campaigns/ui/campaign-navigation/campaign-navigation';
import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { CombatStore } from '@app/features/combat/application/combat.store';
import { CombatPanel } from '@app/features/combat/ui/combat-panel/combat-panel';
import { RecentResourceStore } from '@app/features/recent-resources/application/recent-resource.store';
import { RecentResourceList } from '@app/features/recent-resources/ui/recent-resource-list/recent-resource-list';

@Component({
  selector: 'app-campaign-layout',
  imports: [CampaignNavigation, CombatPanel, RecentResourceList, RouterOutlet],
  providers: [CampaignContext, CombatStore, RecentResourceStore],
  templateUrl: './campaign-layout.html',
  styleUrl: './campaign-layout.scss',
})
export class CampaignLayout implements OnInit {
  private readonly context = inject(CampaignContext);
  private readonly router = inject(Router);
  protected readonly combat = inject(CombatStore);
  protected readonly recentResources = inject(RecentResourceStore);
  protected readonly campaign = this.context.campaign;
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const campaign = await this.context.load();
      if (!campaign) {
        await this.router.navigate(['/campaigns']);
        return;
      }
      await Promise.all([
        this.combat.initialize(campaign.id),
        this.recentResources.initialize(campaign.id),
      ]);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Impossible de charger cette campagne.',
      );
    }
  }
}
