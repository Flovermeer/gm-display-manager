import { TestBed } from '@angular/core/testing';

import { createEmptyRichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import {
  RichTextFeatureEditor,
  type RichTextFeature,
} from '@app/shared/ui/rich-text-feature-editor/rich-text-feature-editor';

describe('RichTextFeatureEditor', () => {
  it('adds, renames and removes an entry', () => {
    const fixture = TestBed.createComponent(RichTextFeatureEditor);
    fixture.componentRef.setInput('inputIdPrefix', 'monster-action');
    fixture.componentRef.setInput('title', 'Actions');
    fixture.componentRef.setInput('singularLabel', 'une action');
    const changes: (readonly RichTextFeature[])[] = [];
    fixture.componentInstance.featuresChange.subscribe((features) => changes.push(features));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.ui-button')?.click();
    expect(changes[0]).toHaveLength(1);

    fixture.componentRef.setInput('features', changes[0]);
    fixture.detectChanges();
    const input = element.querySelector<HTMLInputElement>('input');
    if (!input) throw new Error('Feature name field not found.');
    input.value = 'Attaques multiples';
    input.dispatchEvent(new Event('input'));
    const renamed = changes.at(-1);
    expect(renamed?.[0]?.name).toBe('Attaques multiples');

    fixture.componentRef.setInput('features', renamed);
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.rich-feature-editor__remove')?.click();
    expect(changes.at(-1)).toEqual([]);
  });

  it('keeps the provided rich text document when another entry is added', () => {
    const existing = {
      id: 'feature-id',
      name: 'Résistance légendaire',
      description: createEmptyRichTextDocument(),
    };
    const fixture = TestBed.createComponent(RichTextFeatureEditor);
    fixture.componentRef.setInput('inputIdPrefix', 'monster-trait');
    fixture.componentRef.setInput('title', 'Capacités');
    fixture.componentRef.setInput('singularLabel', 'une capacité');
    fixture.componentRef.setInput('features', [existing]);
    let emitted: readonly RichTextFeature[] = [];
    fixture.componentInstance.featuresChange.subscribe((features) => (emitted = features));
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.ui-button')?.click();

    expect(emitted).toHaveLength(2);
    expect(emitted[0]).toEqual(existing);
  });
});
