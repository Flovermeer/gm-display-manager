import { TestBed } from '@angular/core/testing';

import { TagInput } from '@app/shared/tag-input/tag-input';

describe('TagInput', () => {
  it('adds unique tags and removes one with its button', async () => {
    const fixture = TestBed.createComponent(TagInput);
    fixture.componentRef.setInput('inputId', 'languages');
    fixture.componentRef.setInput('label', 'Langues');
    fixture.componentRef.setInput('value', ['Commun']);
    const changes: string[][] = [];
    fixture.componentInstance.valueChange.subscribe((value) => changes.push([...value]));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('input');
    if (!input) throw new Error('Tag input not found.');
    input.value = 'Elfique, commun';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(changes).toEqual([['Commun', 'Elfique']]);

    fixture.componentRef.setInput('value', changes[0]);
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('app-tag-pill button')?.click();
    expect(changes).toEqual([['Commun', 'Elfique'], ['Elfique']]);
  });
});
