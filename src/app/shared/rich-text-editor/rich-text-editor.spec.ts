import { TestBed } from '@angular/core/testing';
import { Editor } from '@tiptap/core';

import { RICH_TEXT_SCHEMA_VERSION, type RichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';

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

  it('keeps a missing resource mention readable as ordinary text', async () => {
    const fixture = TestBed.createComponent(RichTextEditor);
    fixture.componentRef.setInput('editable', false);
    fixture.componentRef.setInput('mentionCandidates', []);
    fixture.componentRef.setInput('value', {
      schemaVersion: RICH_TEXT_SCHEMA_VERSION,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'resourceMention',
                attrs: { resourceType: 'npc', resourceId: 'deleted-id', label: 'Ancien PNJ' },
              },
            ],
          },
        ],
      },
    } satisfies RichTextDocument);
    fixture.detectChanges();
    await fixture.whenStable();

    const mention = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-resource-mention="broken"]',
    );
    expect(mention?.textContent).toBe('@Ancien PNJ');
    expect(mention?.classList.contains('resource-mention')).toBe(false);
  });

  it('emits an existing resource mention when activated in read-only mode', async () => {
    const fixture = TestBed.createComponent(RichTextEditor);
    const candidate = { resourceType: 'npc' as const, resourceId: 'npc-id', label: 'Syndra' };
    const activated = vi.fn();
    fixture.componentInstance.mentionActivate.subscribe(activated);
    fixture.componentRef.setInput('editable', false);
    fixture.componentRef.setInput('mentionCandidates', [candidate]);
    fixture.componentRef.setInput('value', {
      schemaVersion: RICH_TEXT_SCHEMA_VERSION,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'resourceMention',
                attrs: { resourceType: 'npc', resourceId: 'npc-id', label: 'Syndra' },
              },
            ],
          },
        ],
      },
    } satisfies RichTextDocument);
    fixture.detectChanges();
    await fixture.whenStable();

    const mention = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '[data-resource-mention="resolved"]',
    );
    expect(mention?.getAttribute('role')).toBe('link');
    mention?.click();

    expect(activated).toHaveBeenCalledWith(candidate);
  });
});
