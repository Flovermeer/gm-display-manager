import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Editor, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

import {
  createEmptyRichTextDocument,
  RICH_TEXT_SCHEMA_VERSION,
  type RichTextDocument,
} from './rich-text-document';

@Component({
  selector: 'app-rich-text-editor',
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.scss',
  encapsulation: ViewEncapsulation.None,
})
export class RichTextEditor implements AfterViewInit, OnDestroy {
  readonly value = input<RichTextDocument>(createEmptyRichTextDocument());
  readonly valueChange = output<RichTextDocument>();

  private readonly editorHost = viewChild.required<ElementRef<HTMLDivElement>>('editorHost');
  private readonly editorReady = signal(false);
  private readonly editorRevision = signal(0);
  private editor: Editor | null = null;

  private readonly synchronizeExternalValue = effect(() => {
    const value = this.value();
    this.editorReady();

    if (!this.editor || documentsAreEqual(this.editor.getJSON(), value.content)) return;
    this.editor.commands.setContent(value.content, { emitUpdate: false });
    this.editorRevision.update((revision) => revision + 1);
  });

  ngAfterViewInit(): void {
    this.editor = new Editor({
      element: this.editorHost().nativeElement,
      extensions: [
        StarterKit.configure({
          link: {
            openOnClick: false,
            defaultProtocol: 'https',
          },
        }),
      ],
      content: this.value().content,
      editorProps: {
        attributes: {
          'aria-label': 'Contenu de la note',
          role: 'textbox',
        },
      },
      onSelectionUpdate: () => this.editorRevision.update((revision) => revision + 1),
      onUpdate: ({ editor }) => {
        this.editorRevision.update((revision) => revision + 1);
        this.valueChange.emit({
          schemaVersion: RICH_TEXT_SCHEMA_VERSION,
          content: editor.getJSON(),
        });
      },
    });
    this.editorReady.set(true);
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
    this.editor = null;
  }

  protected toggleBold(): void {
    this.editor?.chain().focus().toggleBold().run();
  }

  protected toggleItalic(): void {
    this.editor?.chain().focus().toggleItalic().run();
  }

  protected toggleHeading(level: 2 | 3): void {
    this.editor?.chain().focus().toggleHeading({ level }).run();
  }

  protected toggleBulletList(): void {
    this.editor?.chain().focus().toggleBulletList().run();
  }

  protected toggleOrderedList(): void {
    this.editor?.chain().focus().toggleOrderedList().run();
  }

  protected toggleBlockquote(): void {
    this.editor?.chain().focus().toggleBlockquote().run();
  }

  protected editLink(): void {
    if (!this.editor) return;

    const previousUrl = this.editor.getAttributes('link')['href'] as string | undefined;
    const url = window.prompt('Adresse du lien', previousUrl ?? 'https://');
    if (url === null) return;

    const trimmedUrl = url.trim();
    if (trimmedUrl === '') {
      this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    this.editor.chain().focus().extendMarkRange('link').setLink({ href: trimmedUrl }).run();
  }

  protected isActive(name: string, attributes?: Record<string, unknown>): boolean {
    this.editorRevision();
    return this.editor?.isActive(name, attributes) ?? false;
  }
}

function documentsAreEqual(current: JSONContent, next: JSONContent): boolean {
  return JSON.stringify(current) === JSON.stringify(next);
}
