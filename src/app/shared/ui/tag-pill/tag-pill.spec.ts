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
});
