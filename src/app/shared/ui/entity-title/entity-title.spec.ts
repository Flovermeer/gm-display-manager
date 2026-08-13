import { TestBed } from '@angular/core/testing';

import { EntityTitle } from './entity-title';

describe('EntityTitle', () => {
  it('renders a kicker and an identified title', () => {
    const fixture = TestBed.createComponent(EntityTitle);
    fixture.componentRef.setInput('kicker', 'Fiche du PNJ');
    fixture.componentRef.setInput('title', 'Syndra Silvane');
    fixture.componentRef.setInput('headingId', 'npc-title');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.entity-workspace__kicker')?.textContent).toContain(
      'Fiche du PNJ',
    );
    expect(element.querySelector('#npc-title')?.textContent).toContain('Syndra Silvane');
  });
});
