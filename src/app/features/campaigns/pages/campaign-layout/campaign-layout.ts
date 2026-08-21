import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { CampaignNavigation } from '@app/features/campaigns/ui/campaign-navigation/campaign-navigation';
import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { CombatStore } from '@app/features/combat/application/combat.store';
import { CombatPanel } from '@app/features/combat/ui/combat-panel/combat-panel';
import { RecentResourceStore } from '@app/features/recent-resources/application/recent-resource.store';
import { RecentResourceList } from '@app/features/recent-resources/ui/recent-resource-list/recent-resource-list';
import { PlayerDisplayMonitorSessionService } from '@app/features/display/application/player-display-monitor-session.service';
import { ToastOutlet } from '@app/shared/ui/toast/toast-outlet';

@Component({
  selector: 'app-campaign-layout',
  imports: [CampaignNavigation, CombatPanel, RecentResourceList, RouterOutlet, ToastOutlet],
  providers: [
    CampaignContext,
    CombatStore,
    RecentResourceStore,
    PlayerDisplayMonitorSessionService,
  ],
  templateUrl: './campaign-layout.html',
  styleUrl: './campaign-layout.scss',
})
export class CampaignLayout implements OnInit, OnDestroy {
  private readonly context = inject(CampaignContext);
  private readonly router = inject(Router);
  protected readonly combat = inject(CombatStore);
  protected readonly recentResources = inject(RecentResourceStore);
  private readonly playerDisplayMonitorSession = inject(PlayerDisplayMonitorSessionService);
  protected readonly campaign = this.context.campaign;
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.initialize();
  }

  ngOnDestroy(): void {
    this.playerDisplayMonitorSession.stop();
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
        this.playerDisplayMonitorSession.start(),
      ]);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Impossible de charger cette campagne.',
      );
    }
  }
}
