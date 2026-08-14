import {
  AfterViewInit,
  Component,
  computed,
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
} from '@app/shared/rich-text-editor/rich-text-document';
import {
  createResourceMentionExtension,
  createResourceMentionTrigger,
  type ResourceMentionCandidate,
  type ResourceMentionMatch,
} from '@app/shared/rich-text-editor/resource-mention';

@Component({
  selector: 'app-rich-text-editor',
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.scss',
  encapsulation: ViewEncapsulation.None,
})
export class RichTextEditor implements AfterViewInit, OnDestroy {
  readonly value = input<RichTextDocument>(createEmptyRichTextDocument());
  readonly editable = input(true);
  readonly mentionCandidates = input<readonly ResourceMentionCandidate[]>([]);
  readonly valueChange = output<RichTextDocument>();
  readonly mentionActivate = output<ResourceMentionCandidate>();

  private readonly editorHost = viewChild.required<ElementRef<HTMLDivElement>>('editorHost');
  private readonly editorReady = signal(false);
  private readonly editorRevision = signal(0);
  protected readonly mentionMatch = signal<ResourceMentionMatch | null>(null);
  protected readonly selectedMentionIndex = signal(0);
  protected readonly filteredMentionCandidates = computed(() => {
    const match = this.mentionMatch();
    if (!match) return [];
    const query = normalizeSearch(match.query);
    return this.mentionCandidates()
      .filter((candidate) => normalizeSearch(candidate.label).includes(query))
      .slice(0, 8);
  });
  private editor: Editor | null = null;

  private readonly synchronizeExternalValue = effect(() => {
    const value = this.value();
    this.editorReady();

    if (!this.editor || documentsAreEqual(this.editor.getJSON(), value.content)) return;
    this.editor.commands.setContent(value.content, { emitUpdate: false });
    this.editorRevision.update((revision) => revision + 1);
  });

  private readonly synchronizeEditableState = effect(() => {
    const editable = this.editable();
    this.editorReady();
    this.editor?.setEditable(editable);
  });

  private readonly synchronizeMentionAvailability = effect(() => {
    this.mentionCandidates();
    this.editorReady();
    if (!this.editor) return;
    this.editor.commands.setContent(this.editor.getJSON(), { emitUpdate: false });
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
        createResourceMentionExtension({
          isAvailable: (resourceType, resourceId) =>
            this.mentionCandidates().some(
              (candidate) =>
                candidate.resourceType === resourceType && candidate.resourceId === resourceId,
            ),
        }),
        createResourceMentionTrigger(
          (match) => {
            this.mentionMatch.set(this.editable() ? match : null);
            this.selectedMentionIndex.set(0);
          },
          (event) => this.handleMentionKeydown(event),
        ),
      ],
      content: this.value().content,
      editable: this.editable(),
      editorProps: {
        attributes: {
          'aria-label': 'Contenu de la note',
          role: 'textbox',
        },
        handleDOMEvents: {
          click: (_view, event) => this.activateMention(event.target),
          keydown: (_view, event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return false;
            return this.activateMention(document.activeElement);
          },
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

  protected insertMention(candidate: ResourceMentionCandidate): void {
    const match = this.mentionMatch();
    if (!this.editor || !match) return;
    this.editor
      .chain()
      .focus()
      .deleteRange({ from: match.from, to: match.to })
      .insertContent([
        {
          type: 'resourceMention',
          attrs: {
            resourceType: candidate.resourceType,
            resourceId: candidate.resourceId,
            label: candidate.label,
          },
        },
        { type: 'text', text: ' ' },
      ])
      .run();
    this.mentionMatch.set(null);
  }

  protected resourceTypeLabel(candidate: ResourceMentionCandidate): string {
    const labels = {
      'player-character': 'PJ',
      npc: 'PNJ',
      monster: 'Monstre',
      location: 'Lieu',
      item: 'Objet',
      scene: 'Scène',
    } as const;
    return labels[candidate.resourceType];
  }

  private activateMention(target: EventTarget | null): boolean {
    if (this.editable() || !(target instanceof Element)) return false;
    const element = target.closest<HTMLElement>('[data-resource-mention="resolved"]');
    if (!element) return false;
    const resourceType = element.dataset['resourceType'];
    const resourceId = element.dataset['resourceId'];
    const candidate = this.mentionCandidates().find(
      (item) => item.resourceType === resourceType && item.resourceId === resourceId,
    );
    if (!candidate) return false;
    this.mentionActivate.emit(candidate);
    return true;
  }

  protected isActive(name: string, attributes?: Record<string, unknown>): boolean {
    this.editorRevision();
    return this.editor?.isActive(name, attributes) ?? false;
  }

  private handleMentionKeydown(event: KeyboardEvent): boolean {
    const candidates = this.filteredMentionCandidates();
    if (!this.mentionMatch() || candidates.length === 0) return false;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      this.selectedMentionIndex.update(
        (index) => (index + direction + candidates.length) % candidates.length,
      );
      return true;
    }
    if (event.key === 'Enter') {
      const candidate = candidates[this.selectedMentionIndex()];
      if (candidate) this.insertMention(candidate);
      return true;
    }
    if (event.key === 'Escape') {
      this.mentionMatch.set(null);
      return true;
    }
    return false;
  }
}

function documentsAreEqual(current: JSONContent, next: JSONContent): boolean {
  return JSON.stringify(current) === JSON.stringify(next);
}

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
