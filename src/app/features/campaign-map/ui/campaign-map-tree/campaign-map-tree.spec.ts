import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { CampaignMap } from '@app/features/campaign-map/domain/campaign-map';
import { CampaignMapTree } from '@app/features/campaign-map/ui/campaign-map-tree/campaign-map-tree';

describe('CampaignMapTree', () => {
  it('renders the campaign as a non-clickable root and ordered resource links', async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignMapTree],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(CampaignMapTree);
    fixture.componentRef.setInput('map', map);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.campaign-map__root')?.textContent).toContain(
      'Tomb of Annihilation',
    );
    expect(element.querySelector('.campaign-map__root a')).toBeNull();
    expect(
      [...element.querySelectorAll<HTMLAnchorElement>('a')].map(({ textContent }) =>
        textContent?.trim(),
      ),
    ).toEqual([
      'Chapitre 1Le portArrivée à Chult',
      'PNJSyndra Silvane',
      'Scène 1La tavernePremière rencontre',
      'LieuPort Nyanzaru',
    ]);
    expect(
      element.querySelector<HTMLAnchorElement>('.campaign-map__node--chapter')?.href,
    ).toContain('/campaigns/campaign-id/chapters?resourceId=chapter-id');
    expect(element.querySelector<HTMLAnchorElement>('.campaign-map__node--scene')?.href).toContain(
      '/campaigns/campaign-id/scenes?resourceId=scene-id',
    );
    expect(
      element.querySelector<HTMLAnchorElement>('.campaign-map__node--resource')?.href,
    ).toContain('/campaigns/campaign-id/npcs?resourceId=npc-id');
    expect(element.querySelector('.campaign-map__node--missing')?.textContent).toContain(
      'Ancien objet',
    );
    expect(element.querySelector('.campaign-map__node--missing')?.closest('a')).toBeNull();
  });

  it('uses a bounded viewport for the compact variant', async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignMapTree],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(CampaignMapTree);
    fixture.componentRef.setInput('map', map);
    fixture.componentRef.setInput('variant', 'compact');
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.campaign-map--compact'),
    ).toBeTruthy();
  });
});

const map: CampaignMap = {
  campaignId: 'campaign-id',
  campaignName: 'Tomb of Annihilation',
  sceneCount: 1,
  chapters: [
    {
      id: 'chapter-id',
      title: 'Le port',
      summary: 'Arrivée à Chult',
      mentions: [
        {
          resourceType: 'npc',
          resourceId: 'npc-id',
          label: 'Syndra Silvane',
          available: true,
        },
        {
          resourceType: 'item',
          resourceId: 'missing-item',
          label: 'Ancien objet',
          available: false,
        },
      ],
      scenes: [
        {
          id: 'scene-id',
          name: 'La taverne',
          summary: 'Première rencontre',
          resources: [
            {
              resourceType: 'location',
              resourceId: 'location-id',
              label: 'Port Nyanzaru',
              available: true,
            },
          ],
        },
      ],
    },
  ],
};
