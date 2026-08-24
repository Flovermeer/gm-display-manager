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
    ).toEqual(['Chapitre 1Le portArrivée à Chult', 'Scène 1La tavernePremière rencontre']);
    expect(
      element.querySelector<HTMLAnchorElement>('.campaign-map__node--chapter')?.href,
    ).toContain('/campaigns/campaign-id/chapters?resourceId=chapter-id');
    expect(element.querySelector<HTMLAnchorElement>('.campaign-map__node--scene')?.href).toContain(
      '/campaigns/campaign-id/scenes?resourceId=scene-id',
    );
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
      scenes: [
        {
          id: 'scene-id',
          name: 'La taverne',
          summary: 'Première rencontre',
        },
      ],
    },
  ],
};
