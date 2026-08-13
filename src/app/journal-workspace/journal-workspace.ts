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
import { ButtonDirective } from '../shared/ui/button/button.directive';
import { Dialog } from '../shared/ui/dialog/dialog';
import { EmptyState } from '../shared/ui/empty-state/empty-state';

type PendingDecisionResolver = (canLeave: boolean) => void;

type ResourceReference = Readonly<{
  entry: JournalEntry;
  resourceName: string;
  resourceTypeLabel: string;
  preview: string;
}>;

@Component({
  selector: 'app-journal-workspace',
  imports: [JournalEntryList, ButtonDirective, Dialog, EmptyState],
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
  private readonly globalEntries = viewChild<JournalEntryList>(JournalEntryList);
  private pendingDecisionResolver?: PendingDecisionResolver;

  protected readonly campaign = this.campaignContext.campaign;
  protected readonly references = signal<readonly ResourceReference[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly showPendingChangesDialog = signal(false);
  protected readonly hasReferences = computed(() => this.references().length > 0);

  ngOnInit(): void {
    void this.initialize();
  }

  canDeactivate(): boolean | Promise<boolean> {
    if (!this.globalEntries()?.hasPendingChanges()) return true;
    if (this.pendingDecisionResolver) return false;
    this.showPendingChangesDialog.set(true);
    return new Promise<boolean>((resolve) => {
      this.pendingDecisionResolver = resolve;
    });
  }

  protected continueEditing(): void {
    this.resolvePendingDecision(false);
  }

  protected leaveWithoutSaving(): void {
    this.globalEntries()?.discardPendingChanges();
    this.resolvePendingDecision(true);
  }

  protected async saveAndLeave(): Promise<void> {
    if (await this.globalEntries()?.savePendingChanges()) this.resolvePendingDecision(true);
  }

  protected formattedSessionDate(value: string): string {
    return new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value),
    );
  }

  protected async openReference(reference: ResourceReference): Promise<void> {
    const campaign = this.campaign();
    const target = reference.entry.target;
    if (!campaign || !target) return;
    const segment = {
      npc: 'npcs',
      location: 'locations',
      'player-character': 'player-characters',
    }[target.resourceType];
    await this.router.navigate(['/campaigns', campaign.id, segment], {
      queryParams: { resourceId: target.resourceId, entryId: reference.entry.id },
    });
  }

  private async initialize(): Promise<void> {
    try {
      const campaign = await this.campaignContext.load();
      if (!campaign) return;
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
      this.references.set(
        entries
          .filter((entry) => entry.target !== null)
          .map((entry) => {
            const target = entry.target!;
            return {
              entry,
              resourceName:
                names[target.resourceType].get(target.resourceId) ?? 'Ressource supprimée',
              resourceTypeLabel: { npc: 'PNJ', location: 'Lieu', 'player-character': 'PJ' }[
                target.resourceType
              ],
              preview: richTextPreview(entry),
            };
          }),
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Impossible de charger le journal.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private resolvePendingDecision(canLeave: boolean): void {
    const resolve = this.pendingDecisionResolver;
    this.pendingDecisionResolver = undefined;
    this.showPendingChangesDialog.set(false);
    resolve?.(canLeave);
  }
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
