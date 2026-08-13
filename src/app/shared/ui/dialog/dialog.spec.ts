import { TestBed } from '@angular/core/testing';

import { Dialog } from './dialog';

describe('Dialog', () => {
  it('associates its title with the dialog and projects its content', () => {
    const fixture = TestBed.createComponent(Dialog);
    fixture.componentRef.setInput('kicker', 'Confirmation');
    fixture.componentRef.setInput('title', 'Continuer ?');
    fixture.componentRef.setInput('headingId', 'confirmation-title');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector<HTMLElement>('[role="dialog"]');
    const title = element.querySelector<HTMLHeadingElement>('#confirmation-title');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('confirmation-title');
    expect(title?.textContent).toContain('Continuer ?');
  });
});
