import { Location } from '@angular/common';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { CampaignNavigation } from './campaign-navigation';

describe('CampaignNavigation', () => {
  const location = { back: vi.fn() };

  beforeEach(() => vi.clearAllMocks());

  it('shows the campaign and the available navigation entries', async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignNavigation],
      providers: [provideRouter([]), { provide: Location, useValue: location }],
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
      'Chapitres',
      'Lieux',
      'PNJ',
      'PJ',
      'Journal',
      'Accueil',
    ]);
    expect([...element.querySelectorAll('[aria-disabled="true"]')]).toHaveLength(1);
  });

  it('returns to the previous history entry', async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignNavigation],
      providers: [provideRouter([]), { provide: Location, useValue: location }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CampaignNavigation);
    fixture.componentRef.setInput('campaignName', 'Tomb of Annihilation');
    fixture.componentRef.setInput('campaignId', 'campaign-id');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.campaign-back')
      ?.click();

    expect(location.back).toHaveBeenCalledOnce();
  });
});
