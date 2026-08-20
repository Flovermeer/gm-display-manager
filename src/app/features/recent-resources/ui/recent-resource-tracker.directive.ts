import { Directive, effect, inject, input, untracked } from '@angular/core';

import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { RecentResourceStore } from '@app/features/recent-resources/application/recent-resource.store';
import type { RecentResourceType } from '@app/features/recent-resources/domain/recent-resource';

@Directive({ selector: '[appRecentResourceTracker]' })
export class RecentResourceTrackerDirective {
  private readonly campaign = inject(CampaignContext);
  private readonly store = inject(RecentResourceStore, { optional: true });

  readonly recentResourceType = input.required<RecentResourceType>();
  readonly recentResourceId = input<string | null>(null);
  readonly recentResourceLabel = input<string | null>(null);

  constructor() {
    effect(() => {
      const store = this.store;
      const campaign = this.campaign.campaign();
      const resourceType = this.recentResourceType();
      const resourceId = this.recentResourceId();
      const displayName = this.recentResourceLabel();
      if (!store || !campaign || !resourceId || !displayName) return;
      untracked(() => void store.record({ resourceType, resourceId, displayName }));
    });
  }
}
