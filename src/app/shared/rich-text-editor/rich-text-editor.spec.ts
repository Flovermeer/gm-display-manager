import { TestBed } from '@angular/core/testing';
import { Editor } from '@tiptap/core';

import { RICH_TEXT_SCHEMA_VERSION, type RichTextDocument } from './rich-text-document';
import { RichTextEditor } from './rich-text-editor';

const FIRST_DOCUMENT: RichTextDocument = {
  schemaVersion: RICH_TEXT_SCHEMA_VERSION,
  content: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Première note' }] }],
  },
};

describe('RichTextEditor', () => {
  it('renders a JSON document and accepts an external replacement', async () => {
    const fixture = TestBed.createComponent(RichTextEditor);
    fixture.componentRef.setInput('value', FIRST_DOCUMENT);
    fixture.detectChanges();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.tiptap')?.textContent).toContain('Première note');

    fixture.componentRef.setInput('value', {
      schemaVersion: RICH_TEXT_SCHEMA_VERSION,
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Deuxième note' }] }],
      },
    } satisfies RichTextDocument);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(element.querySelector('.tiptap')?.textContent).toContain('Deuxième note');
  });

  it('destroys the Tiptap editor with the Angular component', () => {
    const destroy = vi.spyOn(Editor.prototype, 'destroy');
    const fixture = TestBed.createComponent(RichTextEditor);
    fixture.detectChanges();

    fixture.destroy();

    expect(destroy).toHaveBeenCalledOnce();
    destroy.mockRestore();
  });
});
