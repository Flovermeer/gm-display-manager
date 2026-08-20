import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { RecentResourceStore } from '@app/features/recent-resources/application/recent-resource.store';
import { RecentResourceTrackerDirective } from '@app/features/recent-resources/ui/recent-resource-tracker.directive';

@Component({
  imports: [RecentResourceTrackerDirective],
  template: `
    <section
      appRecentResourceTracker
      recentResourceType="npc"
      [recentResourceId]="resourceId()"
      [recentResourceLabel]="resourceLabel()"
    ></section>
  `,
})
class TestHost {
  readonly resourceId = signal<string | null>(null);
  readonly resourceLabel = signal<string | null>(null);
}

describe('RecentResourceTrackerDirective', () => {
  it('records a resource only once its fiche is displayed', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [TestHost],
      providers: [
        { provide: CampaignContext, useValue: { campaign: signal({ id: 'campaign-id' }) } },
        { provide: RecentResourceStore, useValue: { record } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    expect(record).not.toHaveBeenCalled();

    fixture.componentInstance.resourceId.set('npc-id');
    fixture.componentInstance.resourceLabel.set('Syndra');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(record).toHaveBeenCalledWith({
      resourceType: 'npc',
      resourceId: 'npc-id',
      displayName: 'Syndra',
    });
  });
});
