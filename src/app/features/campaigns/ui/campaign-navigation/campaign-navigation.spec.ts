import { Location } from '@angular/common';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { CampaignNavigation } from '@app/features/campaigns/ui/campaign-navigation/campaign-navigation';

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
      'Scènes',
      'Chapitres',
      'Lieux',
      'PNJ',
      'Bestiaire',
      'PJ',
      'Objets',
      'Journal',
      'Tables',
      '⚙ Configuration',
      'Accueil',
    ]);
    expect([...element.querySelectorAll('[aria-disabled="true"]')]).toHaveLength(0);
    expect(
      [...element.querySelectorAll('button')].some((button) =>
        button.textContent?.includes('Combat'),
      ),
    ).toBe(true);
  });

  it('emits the combat toggle without changing route', async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignNavigation],
      providers: [provideRouter([]), { provide: Location, useValue: location }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CampaignNavigation);
    fixture.componentRef.setInput('campaignName', 'Tomb of Annihilation');
    fixture.componentRef.setInput('campaignId', 'campaign-id');
    const toggle = vi.fn();
    fixture.componentInstance.combatToggle.subscribe(toggle);
    fixture.detectChanges();

    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Combat'))
      ?.click();

    expect(toggle).toHaveBeenCalledOnce();
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
