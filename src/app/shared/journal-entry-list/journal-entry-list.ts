import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import type { JournalEntry, JournalResourceType, JournalTarget } from '../../journal/journal-entry';
import { JournalEntryService } from '../../journal/journal-entry.service';
import {
  createEmptyRichTextDocument,
  type RichTextDocument,
} from '../rich-text-editor/rich-text-document';
import { RichTextEditor } from '../rich-text-editor/rich-text-editor';
import { ButtonDirective } from '../ui/button/button.directive';
import { Dialog } from '../ui/dialog/dialog';

@Component({
  selector: 'app-journal-entry-list',
  imports: [ReactiveFormsModule, RichTextEditor, ButtonDirective, Dialog],
  templateUrl: './journal-entry-list.html',
  styleUrl: './journal-entry-list.scss',
})
export class JournalEntryList {
  private readonly journalEntryService = inject(JournalEntryService);

  readonly campaignId = input.required<string>();
  readonly heading = input('Notes privées du MJ');
  readonly resourceType = input<JournalResourceType | null>(null);
  readonly resourceId = input<string | null>(null);
  readonly focusEntryId = input<string | null>(null);
  readonly showHeading = input(true);
  readonly showEntries = input(true);
  readonly showAddButton = input(true);
  readonly entriesChanged = output<void>();

  protected readonly entries = signal<readonly JournalEntry[]>([]);
  protected readonly editingEntry = signal<JournalEntry | null>(null);
  protected readonly isCreating = signal(false);
  protected readonly draftContent = signal<RichTextDocument>(createEmptyRichTextDocument());
  protected readonly contentDirty = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly entryPendingDeletion = signal<JournalEntry | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly isEditing = computed(() => this.isCreating() || this.editingEntry() !== null);
  protected readonly contentIsValid = computed(() => richTextHasContent(this.draftContent()));
  private readonly target = computed<JournalTarget | null>(() => {
    const resourceType = this.resourceType();
    const resourceId = this.resourceId();
    return resourceType && resourceId ? { resourceType, resourceId } : null;
  });
  protected readonly entryForm = new FormGroup({
    sessionAt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    inGameDate: new FormControl('', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true }),
  });

  private readonly reloadOnTargetChange = effect(() => {
    const campaignId = this.campaignId();
    const target = this.target();
    this.cancelEditing();
    void this.loadEntries(campaignId, target);
  });

  startCreate(): void {
    this.isCreating.set(true);
    this.editingEntry.set(null);
    this.draftContent.set(createEmptyRichTextDocument());
    this.contentDirty.set(false);
    this.entryForm.reset({ sessionAt: currentLocalDateTime(), inGameDate: '', title: '' });
  }

  startEdit(entry: JournalEntry): void {
    this.isCreating.set(false);
    this.editingEntry.set(entry);
    this.draftContent.set(entry.content);
    this.contentDirty.set(false);
    this.entryForm.reset({
      sessionAt: isoToLocalDateTime(entry.sessionAt),
      inGameDate: entry.inGameDate,
      title: entry.title,
    });
  }

  protected cancelEditing(): void {
    this.isCreating.set(false);
    this.editingEntry.set(null);
    this.contentDirty.set(false);
    this.entryForm.reset({ sessionAt: '', inGameDate: '', title: '' });
  }

  protected updateContent(content: RichTextDocument): void {
    this.draftContent.set(content);
    this.contentDirty.set(true);
  }

  hasPendingChanges(): boolean {
    return this.isEditing() && (this.entryForm.dirty || this.contentDirty());
  }

  discardPendingChanges(): void {
    this.cancelEditing();
  }

  async savePendingChanges(): Promise<boolean> {
    if (this.entryForm.invalid || !this.contentIsValid() || this.isSaving()) {
      this.entryForm.markAllAsTouched();
      return false;
    }

    this.isSaving.set(true);
    this.error.set(null);
    try {
      const value = this.entryForm.getRawValue();
      const input = {
        sessionAt: new Date(value.sessionAt).toISOString(),
        inGameDate: value.inGameDate,
        title: value.title,
        content: this.draftContent(),
      };
      const current = this.editingEntry();
      if (current) await this.journalEntryService.update(current, input);
      else await this.journalEntryService.create(this.campaignId(), this.target(), input);
      this.cancelEditing();
      await this.loadEntries(this.campaignId(), this.target());
      this.entriesChanged.emit();
      return true;
    } catch (error) {
      this.error.set(errorMessage(error));
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  protected saveEntry(): void {
    void this.savePendingChanges();
  }

  requestDelete(entry: JournalEntry): void {
    this.entryPendingDeletion.set(entry);
  }

  protected cancelDelete(): void {
    this.entryPendingDeletion.set(null);
  }

  protected async confirmDelete(): Promise<void> {
    const entry = this.entryPendingDeletion();
    if (!entry || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      await this.journalEntryService.delete(entry);
      this.entryPendingDeletion.set(null);
      await this.loadEntries(this.campaignId(), this.target());
      this.entriesChanged.emit();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected formattedSessionDate(value: string): string {
    return new Intl.DateTimeFormat('fr-BE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private async loadEntries(campaignId: string, target: JournalTarget | null): Promise<void> {
    try {
      this.entries.set(
        target
          ? await this.journalEntryService.listForTarget(campaignId, target)
          : await this.journalEntryService.listGlobal(campaignId),
      );
      queueMicrotask(() => this.focusRequestedEntry());
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private focusRequestedEntry(): void {
    const id = this.focusEntryId();
    if (!id) return;
    document.getElementById(`journal-entry-${id}`)?.scrollIntoView({ block: 'center' });
  }
}

function currentLocalDateTime(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function isoToLocalDateTime(value: string): string {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function richTextHasContent(document: RichTextDocument): boolean {
  return richTextContent(document.content).trim().length > 0;
}

function richTextContent(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  if (Array.isArray(value)) return value.map(richTextContent).join(' ');
  const record = value as Record<string, unknown>;
  return `${typeof record['text'] === 'string' ? record['text'] : ''} ${richTextContent(record['content'])}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Impossible d'enregistrer cette note.";
}
