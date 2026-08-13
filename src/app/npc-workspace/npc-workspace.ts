import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CampaignContext } from '../campaign-layout/campaign-context';
import { DisplayGateway } from '../display/display.gateway';
import { PlayerDisplayStore } from '../display/player-display.store';
import { NpcPortraitGateway } from '../media/npc-portrait.gateway';
import { NpcIdleVideoGateway } from '../media/npc-idle-video.gateway';
import type { PendingChangesAware } from '../navigation/pending-changes.guard';
import { NPC_STATUSES, type Npc, type NpcStatus } from '../npc/npc';
import { NpcService } from '../npc/npc.service';

type PendingDecisionResolver = (canLeave: boolean) => void;
const DEMO_NPC_PORTRAIT_URL = '/demo/innkeeper.svg';

@Component({
  selector: 'app-npc-workspace',
  imports: [ReactiveFormsModule],
  templateUrl: './npc-workspace.html',
  styleUrl: './npc-workspace.scss',
})
export class NpcWorkspace implements OnInit, PendingChangesAware {
  private readonly campaignContext = inject(CampaignContext);
  private readonly npcService = inject(NpcService);
  private readonly npcPortraitGateway = inject(NpcPortraitGateway);
  private readonly npcIdleVideoGateway = inject(NpcIdleVideoGateway);
  private readonly displayGateway = inject(DisplayGateway);
  private readonly playerDisplayStore = inject(PlayerDisplayStore);
  private pendingDecisionResolver?: PendingDecisionResolver;

  protected readonly campaign = this.campaignContext.campaign;
  protected readonly npcs = signal<readonly Npc[]>([]);
  protected readonly selectedNpc = signal<Npc | null>(null);
  protected readonly portraitUrl = signal<string>(DEMO_NPC_PORTRAIT_URL);
  protected readonly draftPortraitPath = signal<string | null>(null);
  protected readonly draftIdleVideoPath = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly isSidebarCollapsed = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isImportingPortrait = signal(false);
  protected readonly isImportingVideo = signal(false);
  protected readonly isPublishing = signal(false);
  protected readonly isPlayerDisplayOpen = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly showPendingChangesDialog = signal(false);
  protected readonly showDeleteDialog = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statuses = NPC_STATUSES;
  protected readonly effectivePortraitPath = computed(
    () => this.draftPortraitPath() ?? this.selectedNpc()?.portraitPath ?? null,
  );
  protected readonly isUsingDemoPortrait = computed(() => this.effectivePortraitPath() === null);
  protected readonly effectiveIdleVideoPath = computed(
    () => this.draftIdleVideoPath() ?? this.selectedNpc()?.idleVideoPath ?? null,
  );
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
    this.portraitUrl.set(DEMO_NPC_PORTRAIT_URL);
    this.draftPortraitPath.set(null);
    this.draftIdleVideoPath.set(null);
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
    void this.abandonChanges();
  }

  protected async choosePortrait(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign || this.isImportingPortrait()) {
      return;
    }

    this.isImportingPortrait.set(true);
    this.error.set(null);

    try {
      const importedPath = await this.npcPortraitGateway.chooseAndImport(campaign.id);
      if (!importedPath) {
        return;
      }

      const previewUrl = await this.npcPortraitGateway
        .resolveUrl(importedPath)
        .catch(async (error: unknown) => {
          await this.npcPortraitGateway.discard(importedPath);
          throw error;
        });
      const previousDraft = this.draftPortraitPath();
      this.draftPortraitPath.set(importedPath);
      this.portraitUrl.set(previewUrl);
      this.npcForm.markAsDirty();

      if (previousDraft) {
        await this.npcPortraitGateway.discard(previousDraft);
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.isImportingPortrait.set(false);
    }
  }

  protected async chooseIdleVideo(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign || this.isImportingVideo()) return;
    this.isImportingVideo.set(true);
    this.error.set(null);
    try {
      const importedPath = await this.npcIdleVideoGateway.chooseAndImport(campaign.id);
      if (!importedPath) return;
      const previousDraft = this.draftIdleVideoPath();
      this.draftIdleVideoPath.set(importedPath);
      this.npcForm.markAsDirty();
      if (previousDraft) await this.npcIdleVideoGateway.discard(previousDraft);
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.isImportingVideo.set(false);
    }
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
      const portraitPath = this.effectivePortraitPath();
      const idleVideoPath = this.effectiveIdleVideoPath();
      const previousIdleVideoPath = selectedNpc?.idleVideoPath ?? null;
      const savedNpc = this.isCreating()
        ? await this.npcService.create(
            campaign.id,
            this.npcForm.getRawValue(),
            portraitPath,
            idleVideoPath,
          )
        : selectedNpc
          ? await this.npcService.update(
              selectedNpc,
              this.npcForm.getRawValue(),
              portraitPath,
              idleVideoPath,
            )
          : null;

      if (!savedNpc) {
        return false;
      }

      this.draftPortraitPath.set(null);
      this.draftIdleVideoPath.set(null);
      await this.reloadNpcs();
      this.openReadOnly(savedNpc);
      await this.refreshPublishedNpc(savedNpc);
      if (previousIdleVideoPath && previousIdleVideoPath !== savedNpc.idleVideoPath) {
        await this.npcIdleVideoGateway.discard(previousIdleVideoPath);
      }
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

  protected async showNpcOnPlayerDisplay(): Promise<void> {
    const npc = this.selectedNpc();
    if (!npc || !this.isPlayerDisplayOpen() || this.isPublishing()) {
      return;
    }

    this.isPublishing.set(true);
    this.error.set(null);

    try {
      const state = {
        mode: 'npc' as const,
        npcId: npc.id,
        name: npc.name,
        portraitPath: npc.portraitPath
          ? await this.npcPortraitGateway.resolveUrl(npc.portraitPath)
          : DEMO_NPC_PORTRAIT_URL,
        ...(npc.idleVideoPath
          ? { idleVideoPath: await this.npcIdleVideoGateway.resolveUrl(npc.idleVideoPath) }
          : {}),
      };
      this.playerDisplayStore.setState(state);
      await this.displayGateway.sendPlayerDisplayState(state);
    } catch (error) {
      this.error.set(this.errorMessage(error));
      this.isPlayerDisplayOpen.set(false);
    } finally {
      this.isPublishing.set(false);
    }
  }

  protected playerDisplayActionTitle(): string {
    if (!this.isPlayerDisplayOpen()) {
      return "Ouvre d'abord l'écran joueurs depuis la régie.";
    }

    return "Afficher ce PNJ sur l'écran joueurs";
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
      const displayState = this.playerDisplayStore.state();
      if (displayState.mode === 'npc' && displayState.npcId === npc.id) {
        this.playerDisplayStore.showBlank();
        if (this.isPlayerDisplayOpen()) {
          await this.displayGateway.sendPlayerDisplayState({ mode: 'blank' });
        }
      }

      await this.npcService.delete(npc);
      if (npc.portraitPath) {
        try {
          await this.npcPortraitGateway.discard(npc.portraitPath);
        } catch (error) {
          this.error.set(this.errorMessage(error));
        }
      }
      if (npc.idleVideoPath) {
        try {
          await this.npcIdleVideoGateway.discard(npc.idleVideoPath);
        } catch (error) {
          this.error.set(this.errorMessage(error));
        }
      }
      await this.reloadNpcs();
      this.selectedNpc.set(null);
      this.portraitUrl.set(DEMO_NPC_PORTRAIT_URL);
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

  protected async leaveWithoutSaving(): Promise<void> {
    await this.abandonChanges();
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
    try {
      if (!(await this.campaignContext.load())) return;
      await this.reloadNpcs();
      if (this.displayGateway.isDesktop) {
        this.isPlayerDisplayOpen.set(await this.displayGateway.isPlayerDisplayOpen());
      }
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
    this.draftPortraitPath.set(null);
    this.draftIdleVideoPath.set(null);
    this.populateForm(refreshedNpc);
    void this.loadPortraitPreview(refreshedNpc.portraitPath);
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

  private async abandonChanges(): Promise<void> {
    const draftPortraitPath = this.draftPortraitPath();
    const draftIdleVideoPath = this.draftIdleVideoPath();
    this.draftPortraitPath.set(null);
    this.draftIdleVideoPath.set(null);
    if (draftPortraitPath) {
      try {
        await this.npcPortraitGateway.discard(draftPortraitPath);
      } catch (error) {
        this.error.set(this.errorMessage(error));
      }
    }
    if (draftIdleVideoPath) {
      try {
        await this.npcIdleVideoGateway.discard(draftIdleVideoPath);
      } catch (error) {
        this.error.set(this.errorMessage(error));
      }
    }

    const selectedNpc = this.selectedNpc();
    this.isEditing.set(false);
    this.isCreating.set(false);
    if (selectedNpc) {
      this.populateForm(selectedNpc);
      await this.loadPortraitPreview(selectedNpc.portraitPath);
    } else {
      this.npcForm.reset({ name: '', status: 'active', summary: '', notes: '' });
      this.portraitUrl.set(DEMO_NPC_PORTRAIT_URL);
    }
  }

  private async loadPortraitPreview(relativePath: string | null): Promise<void> {
    this.portraitUrl.set(DEMO_NPC_PORTRAIT_URL);
    if (!relativePath) {
      return;
    }

    try {
      const url = await this.npcPortraitGateway.resolveUrl(relativePath);
      if (this.effectivePortraitPath() === relativePath) {
        this.portraitUrl.set(url);
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  private async refreshPublishedNpc(npc: Npc): Promise<void> {
    const currentState = this.playerDisplayStore.state();
    if (currentState.mode !== 'npc' || currentState.npcId !== npc.id) {
      return;
    }

    const state = {
      ...currentState,
      name: npc.name,
      portraitPath: npc.portraitPath
        ? await this.npcPortraitGateway.resolveUrl(npc.portraitPath)
        : DEMO_NPC_PORTRAIT_URL,
      idleVideoPath: npc.idleVideoPath
        ? await this.npcIdleVideoGateway.resolveUrl(npc.idleVideoPath)
        : undefined,
    };
    this.playerDisplayStore.setState(state);
    if (this.isPlayerDisplayOpen()) {
      await this.displayGateway.sendPlayerDisplayState(state);
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
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Une erreur inattendue est survenue.';
  }
}
