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
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Tomb of Annihilation');
    expect(
      [...element.querySelectorAll('button')].map((button) => button.textContent?.trim()),
    ).toEqual(['Régie', 'Écrans']);
    expect([...element.querySelectorAll('a')].map((link) => link.textContent?.trim())).toEqual([
      "Beholder's Inn",
      'Accueil',
    ]);
  });

  it('scrolls inside the campaign without navigating', async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignNavigation],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(CampaignNavigation);
    fixture.componentRef.setInput('campaignName', 'Tomb of Annihilation');
    fixture.detectChanges();
    const target = document.createElement('section');
    target.id = 'campaign-overview';
    target.scrollIntoView = vi.fn();
    document.body.append(target);

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button',
    );
    button?.click();

    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    target.remove();
  });
});
