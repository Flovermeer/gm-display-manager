import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import type { Campaign } from '../campaign/campaign';
import { CampaignService } from '../campaign/campaign.service';
import { CampaignNavigation } from '../campaign-navigation/campaign-navigation';
import type { PendingChangesAware } from '../navigation/pending-changes.guard';
import { NPC_STATUSES, type Npc, type NpcStatus } from '../npc/npc';
import { NpcService } from '../npc/npc.service';

type PendingDecisionResolver = (canLeave: boolean) => void;

@Component({
  selector: 'app-npc-workspace',
  imports: [CampaignNavigation, ReactiveFormsModule],
  templateUrl: './npc-workspace.html',
  styleUrl: './npc-workspace.scss',
})
export class NpcWorkspace implements OnInit, PendingChangesAware {
  private readonly campaignService = inject(CampaignService);
  private readonly npcService = inject(NpcService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private pendingDecisionResolver?: PendingDecisionResolver;

  protected readonly campaign = signal<Campaign | null>(null);
  protected readonly npcs = signal<readonly Npc[]>([]);
  protected readonly selectedNpc = signal<Npc | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly isSidebarCollapsed = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly showPendingChangesDialog = signal(false);
  protected readonly showDeleteDialog = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statuses = NPC_STATUSES;
  protected readonly filteredNpcs = computed(() => {
    const searchTerm = this.searchTerm().trim().toLocaleLowerCase('fr');
    if (!searchTerm) {
      return this.npcs();
    }

    return this.npcs().filter((npc) =>
      [npc.name, npc.summary].some((value) => value.toLocaleLowerCase('fr').includes(searchTerm)),
    );
  });
  protected readonly npcForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    status: new FormControl<NpcStatus>('active', { nonNullable: true }),
    summary: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    void this.initialize();
  }

  canDeactivate(): boolean | Promise<boolean> {
    return this.confirmPendingChanges();
  }

  protected toggleSidebar(): void {
    this.isSidebarCollapsed.update((collapsed) => !collapsed);
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected async requestSelectNpc(npc: Npc): Promise<void> {
    if (this.selectedNpc()?.id === npc.id && !this.isCreating()) {
      return;
    }

    if (await this.confirmPendingChanges()) {
      this.openReadOnly(npc);
    }
  }

  protected async requestCreateNpc(): Promise<void> {
    if (!(await this.confirmPendingChanges())) {
      return;
    }

    this.selectedNpc.set(null);
    this.isCreating.set(true);
    this.isEditing.set(true);
    this.npcForm.reset({ name: '', status: 'active', summary: '', notes: '' });
    this.npcForm.markAsPristine();
  }

  protected editNpc(): void {
    const npc = this.selectedNpc();
    if (!npc) {
      return;
    }

    this.isCreating.set(false);
    this.isEditing.set(true);
    this.populateForm(npc);
  }

  protected cancelEditing(): void {
    this.abandonChanges();
  }

  protected async saveNpc(): Promise<boolean> {
    if (this.npcForm.invalid || this.isSaving()) {
      this.npcForm.markAllAsTouched();
      return false;
    }

    const campaign = this.campaign();
    if (!campaign) {
      return false;
    }

    this.isSaving.set(true);
    this.error.set(null);

    try {
      const selectedNpc = this.selectedNpc();
      const savedNpc = this.isCreating()
        ? await this.npcService.create(campaign.id, this.npcForm.getRawValue())
        : selectedNpc
          ? await this.npcService.update(selectedNpc, this.npcForm.getRawValue())
          : null;

      if (!savedNpc) {
        return false;
      }

      await this.reloadNpcs();
      this.openReadOnly(savedNpc);
      return true;
    } catch (error) {
      this.error.set(this.errorMessage(error));
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  protected requestDeleteNpc(): void {
    if (this.selectedNpc()) {
      this.showDeleteDialog.set(true);
    }
  }

  protected cancelDelete(): void {
    this.showDeleteDialog.set(false);
  }

  protected async confirmDeleteNpc(): Promise<void> {
    const npc = this.selectedNpc();
    if (!npc || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);

    try {
      await this.npcService.delete(npc);
      await this.reloadNpcs();
      this.selectedNpc.set(null);
      this.showDeleteDialog.set(false);
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected continueEditing(): void {
    this.resolvePendingDecision(false);
  }

  protected leaveWithoutSaving(): void {
    this.abandonChanges();
    this.resolvePendingDecision(true);
  }

  protected async saveAndLeave(): Promise<void> {
    if (await this.saveNpc()) {
      this.resolvePendingDecision(true);
    }
  }

  protected statusLabel(status: NpcStatus): string {
    const labels: Record<NpcStatus, string> = {
      active: 'Actif',
      dead: 'Mort',
      retired: 'Retiré',
      missing: 'Disparu',
    };
    return labels[status];
  }

  private async initialize(): Promise<void> {
    const campaignId = this.route.snapshot.paramMap.get('campaignId');
    if (!campaignId) {
      await this.router.navigate(['/campaigns']);
      return;
    }

    try {
      const campaign = await this.campaignService.findById(campaignId);
      if (!campaign) {
        await this.router.navigate(['/campaigns']);
        return;
      }

      await this.campaignService.activate(campaign.id);
      this.campaign.set(campaign);
      await this.reloadNpcs();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async reloadNpcs(): Promise<void> {
    const campaign = this.campaign();
    if (campaign) {
      this.npcs.set(await this.npcService.list(campaign.id));
    }
  }

  private openReadOnly(npc: Npc): void {
    const refreshedNpc = this.npcs().find((candidate) => candidate.id === npc.id) ?? npc;
    this.selectedNpc.set(refreshedNpc);
    this.isCreating.set(false);
    this.isEditing.set(false);
    this.populateForm(refreshedNpc);
  }

  private populateForm(npc: Npc): void {
    this.npcForm.reset({
      name: npc.name,
      status: npc.status,
      summary: npc.summary,
      notes: npc.notes,
    });
    this.npcForm.markAsPristine();
  }

  private abandonChanges(): void {
    const selectedNpc = this.selectedNpc();
    this.isEditing.set(false);
    this.isCreating.set(false);
    if (selectedNpc) {
      this.populateForm(selectedNpc);
    } else {
      this.npcForm.reset({ name: '', status: 'active', summary: '', notes: '' });
    }
  }

  private confirmPendingChanges(): boolean | Promise<boolean> {
    if (!this.isEditing() || !this.npcForm.dirty) {
      return true;
    }

    if (this.pendingDecisionResolver) {
      return false;
    }

    this.showPendingChangesDialog.set(true);
    return new Promise<boolean>((resolve) => {
      this.pendingDecisionResolver = resolve;
    });
  }

  private resolvePendingDecision(canLeave: boolean): void {
    const resolve = this.pendingDecisionResolver;
    this.pendingDecisionResolver = undefined;
    this.showPendingChangesDialog.set(false);
    resolve?.(canLeave);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
  }
}
