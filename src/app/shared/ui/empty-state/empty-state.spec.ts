import { TestBed } from '@angular/core/testing';

import { EmptyState } from '@app/shared/ui/empty-state/empty-state';

describe('EmptyState', () => {
  it('renders the shared empty-state contract', () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('icon', '✦');
    fixture.componentRef.setInput('title', 'Aucun chapitre sélectionné');
    fixture.componentRef.setInput('description', 'Sélectionne un chapitre.');
    fixture.componentRef.setInput('headingId', 'chapter-title');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('#chapter-title')?.textContent).toContain(
      'Aucun chapitre sélectionné',
    );
    expect(element.querySelector('.entity-workspace__empty-description')?.textContent).toContain(
      'Sélectionne un chapitre.',
    );
  });
});
