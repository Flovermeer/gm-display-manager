import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { CampaignContext } from '../campaign-layout/campaign-context';
import type { JournalEntry, JournalResourceType } from '../journal/journal-entry';
import { JournalEntryService } from '../journal/journal-entry.service';
import { LocationService } from '../location/location.service';
import type { PendingChangesAware } from '../navigation/pending-changes.guard';
import { NpcService } from '../npc/npc.service';
import { PlayerCharacterService } from '../player-character/player-character.service';
import { JournalEntryList } from '../shared/journal-entry-list/journal-entry-list';
import { RichTextEditor } from '../shared/rich-text-editor/rich-text-editor';
import { ResourceMentionNavigationService } from '../shared/rich-text-editor/resource-mention-navigation.service';
import type { ResourceMentionCandidate } from '../shared/rich-text-editor/resource-mention';
import { ButtonDirective } from '../shared/ui/button/button.directive';
import { Dialog } from '../shared/ui/dialog/dialog';
import { EmptyState } from '../shared/ui/empty-state/empty-state';

type PendingDecisionResolver = (canLeave: boolean) => void;

type ResourceReference = Readonly<{
  resourceName: string;
  resourceTypeLabel: string;
  preview: string;
}>;

type TimelineEntry = Readonly<{
  entry: JournalEntry;
  reference: ResourceReference | null;
}>;

type JournalDay = Readonly<{
  key: string;
  dateLabel: string;
  title: string;
  entries: readonly TimelineEntry[];
}>;

@Component({
  selector: 'app-journal-workspace',
  imports: [JournalEntryList, RichTextEditor, ButtonDirective, Dialog, EmptyState],
  templateUrl: './journal-workspace.html',
  styleUrl: './journal-workspace.scss',
})
export class JournalWorkspace implements OnInit, PendingChangesAware {
  private readonly campaignContext = inject(CampaignContext);
  private readonly journalEntryService = inject(JournalEntryService);
  private readonly npcService = inject(NpcService);
  private readonly locationService = inject(LocationService);
  private readonly characterService = inject(PlayerCharacterService);
  private readonly router = inject(Router);
  private readonly mentionNavigation = inject(ResourceMentionNavigationService);
  private readonly globalEntryEditor = viewChild<JournalEntryList>(JournalEntryList);
  private pendingDecisionResolver?: PendingDecisionResolver;

  protected readonly campaign = this.campaignContext.campaign;
  protected readonly timelineEntries = signal<readonly TimelineEntry[]>([]);
  protected readonly mentionCandidates = signal<readonly ResourceMentionCandidate[]>([]);
  protected readonly expandedDays = signal<ReadonlySet<string>>(new Set());
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly showPendingChangesDialog = signal(false);
  protected readonly journalDays = computed(() => groupByLocalDay(this.timelineEntries()));

  ngOnInit(): void {
    void this.initialize();
  }

  canDeactivate(): boolean | Promise<boolean> {
    if (!this.globalEntryEditor()?.hasPendingChanges()) return true;
    if (this.pendingDecisionResolver) return false;
    this.showPendingChangesDialog.set(true);
    return new Promise<boolean>((resolve) => {
      this.pendingDecisionResolver = resolve;
    });
  }

  protected addNote(): void {
    this.globalEntryEditor()?.startCreate();
  }

  protected editNote(entry: JournalEntry): void {
    this.globalEntryEditor()?.startEdit(entry);
  }

  protected deleteNote(entry: JournalEntry): void {
    this.globalEntryEditor()?.requestDelete(entry);
  }

  protected toggleDay(dayKey: string): void {
    this.expandedDays.update((current) => {
      const next = new Set(current);
      if (next.has(dayKey)) next.delete(dayKey);
      else next.add(dayKey);
      return next;
    });
  }

  protected isDayExpanded(dayKey: string): boolean {
    return this.expandedDays().has(dayKey);
  }

  protected formattedTime(value: string): string {
    return new Intl.DateTimeFormat('fr-BE', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(value),
    );
  }

  protected continueEditing(): void {
    this.resolvePendingDecision(false);
  }

  protected leaveWithoutSaving(): void {
    this.globalEntryEditor()?.discardPendingChanges();
    this.resolvePendingDecision(true);
  }

  protected async saveAndLeave(): Promise<void> {
    if (await this.globalEntryEditor()?.savePendingChanges()) this.resolvePendingDecision(true);
  }

  protected async openReference(item: TimelineEntry): Promise<void> {
    const campaign = this.campaign();
    const target = item.entry.target;
    if (!campaign || !target) return;
    const segment = {
      npc: 'npcs',
      location: 'locations',
      'player-character': 'player-characters',
    }[target.resourceType];
    await this.router.navigate(['/campaigns', campaign.id, segment], {
      queryParams: { resourceId: target.resourceId, entryId: item.entry.id },
    });
  }

  protected openMention(mention: ResourceMentionCandidate): void {
    const campaign = this.campaign();
    if (campaign) void this.mentionNavigation.open(campaign.id, mention);
  }

  protected reloadJournal(): void {
    void this.loadJournal();
  }

  private async initialize(): Promise<void> {
    try {
      const campaign = await this.campaignContext.load();
      if (!campaign) return;
      await this.loadJournal();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadJournal(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    try {
      const [entries, npcs, locations, characters] = await Promise.all([
        this.journalEntryService.list(campaign.id),
        this.npcService.list(campaign.id),
        this.locationService.list(campaign.id),
        this.characterService.list(campaign.id),
      ]);
      const names: Record<JournalResourceType, Map<string, string>> = {
        npc: new Map(npcs.map(({ id, name }) => [id, name])),
        location: new Map(locations.map(({ id, name }) => [id, name])),
        'player-character': new Map(characters.map(({ id, name }) => [id, name])),
      };
      this.mentionCandidates.set([
        ...characters.map(({ id, name }) => ({
          resourceType: 'player-character' as const,
          resourceId: id,
          label: name,
        })),
        ...npcs.map(({ id, name }) => ({
          resourceType: 'npc' as const,
          resourceId: id,
          label: name,
        })),
        ...locations.map(({ id, name }) => ({
          resourceType: 'location' as const,
          resourceId: id,
          label: name,
        })),
      ]);
      this.timelineEntries.set(
        entries.map((entry) => ({
          entry,
          reference: entry.target
            ? {
                resourceName:
                  names[entry.target.resourceType].get(entry.target.resourceId) ??
                  'Ressource supprimée',
                resourceTypeLabel: {
                  npc: 'PNJ',
                  location: 'Lieu',
                  'player-character': 'PJ',
                }[entry.target.resourceType],
                preview: richTextPreview(entry),
              }
            : null,
        })),
      );
      const newestDay = groupByLocalDay(this.timelineEntries())[0]?.key;
      if (newestDay && this.expandedDays().size === 0) this.expandedDays.set(new Set([newestDay]));
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private resolvePendingDecision(canLeave: boolean): void {
    const resolve = this.pendingDecisionResolver;
    this.pendingDecisionResolver = undefined;
    this.showPendingChangesDialog.set(false);
    resolve?.(canLeave);
  }
}

function groupByLocalDay(items: readonly TimelineEntry[]): readonly JournalDay[] {
  const groups = new Map<string, TimelineEntry[]>();
  for (const item of items) {
    const key = localDayKey(item.entry.sessionAt);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([key, entries]) => {
      const chronologicalEntries = [...entries].sort(
        (left, right) =>
          new Date(left.entry.sessionAt).getTime() - new Date(right.entry.sessionAt).getTime(),
      );
      const first = chronologicalEntries[0]!.entry;
      return {
        key,
        dateLabel: new Intl.DateTimeFormat('fr-BE', { dateStyle: 'long' }).format(
          new Date(first.sessionAt),
        ),
        title: first.title || 'Notes de la journée',
        entries: chronologicalEntries,
      };
    })
    .sort((left, right) => right.key.localeCompare(left.key));
}

function localDayKey(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function richTextPreview(entry: JournalEntry): string {
  const text = plainText(entry.content.content).replace(/\s+/g, ' ').trim();
  return text || 'Note sans aperçu.';
}

function plainText(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  if (Array.isArray(value)) return value.map(plainText).join(' ');
  const record = value as Record<string, unknown>;
  return `${typeof record['text'] === 'string' ? record['text'] : ''} ${plainText(record['content'])}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Impossible de charger le journal.';
}
