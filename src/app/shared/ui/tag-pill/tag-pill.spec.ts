import { TestBed } from '@angular/core/testing';

import { TagPill } from '@app/shared/ui/tag-pill/tag-pill';

describe('TagPill', () => {
  it('renders its label and emits a remove request', () => {
    const fixture = TestBed.createComponent(TagPill);
    fixture.componentRef.setInput('label', 'Vision dans le noir');
    const remove = vi.fn();
    fixture.componentInstance.remove.subscribe(remove);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.tag-pill__label')?.textContent).toContain('Vision dans le noir');
    element.querySelector<HTMLButtonElement>('button')?.click();
    expect(remove).toHaveBeenCalledOnce();
  });

  it('renders a catalog option with its details and a specific remove action', () => {
    const fixture = TestBed.createComponent(TagPill);
    fixture.componentRef.setInput('label', 'Elfe');
    fixture.componentRef.setInput('code', 'elfe');
    fixture.componentRef.setInput('detail', 'Faerûn');
    fixture.componentRef.setInput('variant', 'catalog');
    fixture.componentRef.setInput('removeVerb', 'Supprimer');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.tag-pill--catalog')).not.toBeNull();
    expect(element.querySelector('.tag-pill__code')?.textContent).toBe('elfe');
    expect(element.querySelector('.tag-pill__detail')?.textContent).toBe('Faerûn');
    expect(element.querySelector('button')?.getAttribute('aria-label')).toBe('Supprimer Elfe');

    fixture.componentRef.setInput('removable', false);
    fixture.detectChanges();
    expect(element.querySelector('button')).toBeNull();
  });
});
