import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { CampaignNavigation } from './campaign-navigation';

describe('CampaignNavigation', () => {
  it('shows the campaign and the available navigation entries', async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignNavigation],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(CampaignNavigation);
    fixture.componentRef.setInput('campaignName', 'Tomb of Annihilation');
    fixture.componentRef.setInput('campaignId', 'campaign-id');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Tomb of Annihilation');
    expect([...element.querySelectorAll('a')].map((link) => link.textContent?.trim())).toEqual([
      "Beholder's Inn",
      'Régie',
      'Lieux',
      'PNJ',
      'Écrans',
      'Accueil',
    ]);
    expect([...element.querySelectorAll('[aria-disabled="true"]')]).toHaveLength(4);
  });
});
