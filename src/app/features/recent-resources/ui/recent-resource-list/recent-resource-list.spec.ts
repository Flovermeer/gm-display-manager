import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RecentResourceStore } from '@app/features/recent-resources/application/recent-resource.store';
import { RecentResourceList } from '@app/features/recent-resources/ui/recent-resource-list/recent-resource-list';

describe('RecentResourceList', () => {
  it('renders the type and a deep link for each recent resource', async () => {
    await TestBed.configureTestingModule({
      imports: [RecentResourceList],
      providers: [
        provideRouter([]),
        {
          provide: RecentResourceStore,
          useValue: {
            resources: signal([
              {
                campaignId: 'campaign-id',
                resourceType: 'npc',
                resourceId: 'npc-id',
                displayName: 'Syndra',
                viewedOrder: 1,
              },
            ]),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(RecentResourceList);
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a');

    expect(link?.textContent).toContain('PNJ');
    expect(link?.textContent).toContain('Syndra');
    expect(link?.getAttribute('href')).toBe('/campaigns/campaign-id/npcs?resourceId=npc-id');
  });
});
