import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  effect,
  inject,
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
  resourceTypeLabel,
  type ResourceMentionCandidate,
  type ResourceMentionMatch,
} from '@app/shared/rich-text-editor/resource-mention';
import { ResourceMentionDisplayGateway } from '@app/shared/rich-text-editor/resource-mention-display.gateway';

export type MentionMenuPosition = Readonly<{
  left: number;
  top: number | null;
  bottom: number | null;
  maxHeight: number;
}>;

const MENTION_MENU_GAP = 8;
const MENTION_MENU_MAX_HEIGHT = 288;
const MENTION_MENU_MAX_WIDTH = 384;
const MENTION_MENU_MIN_SPACE = 160;
const MENTION_MENU_VIEWPORT_PADDING = 16;

@Component({
  selector: 'app-rich-text-editor',
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.scss',
  encapsulation: ViewEncapsulation.None,
})
export class RichTextEditor implements AfterViewInit, OnDestroy {
  private readonly mentionDisplay = inject(ResourceMentionDisplayGateway, { optional: true });
  readonly value = input<RichTextDocument>(createEmptyRichTextDocument());
  readonly editable = input(true);
  readonly mentionCandidates = input<readonly ResourceMentionCandidate[]>([]);
  readonly valueChange = output<RichTextDocument>();
  readonly mentionActivate = output<ResourceMentionCandidate>();

  private readonly editorHost = viewChild.required<ElementRef<HTMLDivElement>>('editorHost');
  private readonly editorReady = signal(false);
  private readonly editorRevision = signal(0);
  protected readonly mentionMatch = signal<ResourceMentionMatch | null>(null);
  protected readonly mentionMenuPosition = signal<MentionMenuPosition | null>(null);
  protected readonly selectedMentionIndex = signal(0);
  protected readonly displayError = signal<string | null>(null);
  protected readonly filteredMentionCandidates = computed(() => {
    const match = this.mentionMatch();
    if (!match) return [];
    const query = normalizeSearch(match.query);
    return this.mentionCandidates()
      .filter((candidate) => normalizeSearch(candidate.label).includes(query))
      .slice(0, 8);
  });
  private editor: Editor | null = null;
  private readonly refreshMentionMenuPosition = () => this.updateMentionMenuPosition();

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

  private readonly synchronizeMentionDisplayState = effect(() => {
    this.mentionDisplay?.isPlayerDisplayOpen();
    this.mentionDisplay?.isPublishing();
    this.editorReady();
    this.updateMentionDisplayButtons();
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
          displayState: (resourceType, resourceId) =>
            this.mentionDisplayState(resourceType, resourceId),
        }),
        createResourceMentionTrigger(
          (match) => {
            this.mentionMatch.set(this.editable() ? match : null);
            this.selectedMentionIndex.set(0);
            this.updateMentionMenuPosition();
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
          click: (_view, event) =>
            this.displayMention(event.target) || this.activateMention(event.target),
          mouseover: (_view, event) => {
            if (
              event.target instanceof Element &&
              event.target.closest('[data-resource-mention="resolved"]')
            ) {
              void this.mentionDisplay?.refreshPlayerDisplayStatus();
            }
            return false;
          },
          keydown: (_view, event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return false;
            return (
              this.displayMention(document.activeElement) ||
              this.activateMention(document.activeElement)
            );
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
    window.addEventListener('resize', this.refreshMentionMenuPosition);
    window.addEventListener('scroll', this.refreshMentionMenuPosition, true);
    this.editorReady.set(true);
    void this.mentionDisplay?.refreshPlayerDisplayStatus();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.refreshMentionMenuPosition);
    window.removeEventListener('scroll', this.refreshMentionMenuPosition, true);
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
    this.closeMentionMenu();
  }

  protected resourceTypeLabel(candidate: ResourceMentionCandidate): string {
    return resourceTypeLabel(candidate.resourceType);
  }

  private activateMention(target: EventTarget | null): boolean {
    if (this.editable() || !(target instanceof Element)) return false;
    const trigger = target.closest<HTMLElement>('[data-resource-mention-open]');
    const candidate = this.candidateFromElement(trigger);
    if (!candidate) return false;
    this.mentionActivate.emit(candidate);
    return true;
  }

  private displayMention(target: EventTarget | null): boolean {
    if (this.editable() || !(target instanceof Element)) return false;
    const trigger = target.closest<HTMLButtonElement>('[data-resource-mention-display]');
    const candidate = this.candidateFromElement(trigger);
    if (!trigger || trigger.disabled || !candidate || !this.mentionDisplay) return false;
    this.displayError.set(null);
    void this.mentionDisplay.display(candidate).catch((error: unknown) => {
      this.displayError.set(
        error instanceof Error
          ? error.message
          : 'Impossible d’afficher cette ressource sur l’écran joueurs.',
      );
    });
    return true;
  }

  private candidateFromElement(element: Element | null): ResourceMentionCandidate | undefined {
    const mention = element?.closest<HTMLElement>('[data-resource-mention="resolved"]');
    const resourceType = mention?.dataset['resourceType'];
    const resourceId = mention?.dataset['resourceId'];
    return this.mentionCandidates().find(
      (candidate) =>
        candidate.resourceType === resourceType && candidate.resourceId === resourceId,
    );
  }

  private mentionDisplayState(
    resourceType: ResourceMentionCandidate['resourceType'],
    resourceId: string,
  ): 'hidden' | 'disabled' | 'enabled' | 'active' | 'busy' {
    if (this.editable()) return 'hidden';
    const candidate = this.mentionCandidates().find(
      (item) => item.resourceType === resourceType && item.resourceId === resourceId,
    );
    if (!candidate?.playerDisplayAvailable || !this.mentionDisplay) return 'hidden';
    if (this.mentionDisplay.isPublishing()) return 'busy';
    if (!this.mentionDisplay.isPlayerDisplayOpen()) return 'disabled';
    return this.mentionDisplay.isDisplayed(candidate) ? 'active' : 'enabled';
  }

  private updateMentionDisplayButtons(): void {
    if (!this.editorReady()) return;
    for (const mention of this.editorHost().nativeElement.querySelectorAll<HTMLElement>(
      '[data-resource-mention="resolved"]',
    )) {
      const candidate = this.candidateFromElement(mention);
      const button = mention.querySelector<HTMLButtonElement>('[data-resource-mention-display]');
      if (!candidate || !button) continue;
      const state = this.mentionDisplayState(candidate.resourceType, candidate.resourceId);
      const active = state === 'active';
      button.disabled = state === 'disabled' || state === 'busy';
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute(
        'aria-label',
        active
          ? `Arrêter l’affichage de ${candidate.label}`
          : `Afficher ${candidate.label} aux joueurs`,
      );
      button.title = button.disabled
        ? 'Ouvre d’abord l’écran joueurs depuis la régie.'
        : active
          ? 'Arrêter l’affichage'
          : 'Afficher aux joueurs';
    }
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
      this.closeMentionMenu();
      return true;
    }
    return false;
  }

  private updateMentionMenuPosition(): void {
    const match = this.mentionMatch();
    if (!this.editor || !match) {
      this.mentionMenuPosition.set(null);
      return;
    }

    try {
      const cursor = this.editor.view.coordsAtPos(match.to);
      this.mentionMenuPosition.set(
        calculateMentionMenuPosition(cursor, {
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      );
    } catch {
      this.mentionMenuPosition.set(null);
    }
  }

  private closeMentionMenu(): void {
    this.mentionMatch.set(null);
    this.mentionMenuPosition.set(null);
  }
}

export function calculateMentionMenuPosition(
  cursor: Pick<DOMRect, 'left' | 'top' | 'bottom'>,
  viewport: Readonly<{ width: number; height: number }>,
): MentionMenuPosition {
  const menuWidth = Math.min(
    MENTION_MENU_MAX_WIDTH,
    Math.max(0, viewport.width - MENTION_MENU_VIEWPORT_PADDING * 2),
  );
  const maximumLeft = Math.max(
    MENTION_MENU_VIEWPORT_PADDING,
    viewport.width - MENTION_MENU_VIEWPORT_PADDING - menuWidth,
  );
  const left = Math.min(Math.max(cursor.left, MENTION_MENU_VIEWPORT_PADDING), maximumLeft);
  const spaceBelow = Math.max(
    0,
    viewport.height - cursor.bottom - MENTION_MENU_GAP - MENTION_MENU_VIEWPORT_PADDING,
  );
  const spaceAbove = Math.max(
    0,
    cursor.top - MENTION_MENU_GAP - MENTION_MENU_VIEWPORT_PADDING,
  );
  const displayBelow = spaceBelow >= MENTION_MENU_MIN_SPACE || spaceBelow >= spaceAbove;

  return {
    left,
    top: displayBelow ? cursor.bottom + MENTION_MENU_GAP : null,
    bottom: displayBelow ? null : viewport.height - cursor.top + MENTION_MENU_GAP,
    maxHeight: Math.min(MENTION_MENU_MAX_HEIGHT, displayBelow ? spaceBelow : spaceAbove),
  };
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
