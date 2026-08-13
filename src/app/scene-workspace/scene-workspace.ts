import { Component, computed, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { CampaignContext } from '@app/campaign-layout/campaign-context';
import { DisplayGateway } from '@app/display/display.gateway';
import type { PlayerDisplayState } from '@app/display/player-display-state';
import { PlayerDisplayStore } from '@app/display/player-display.store';
import type { Location } from '@app/location/location';
import { LocationService } from '@app/location/location.service';
import { ItemImageGateway } from '@app/media/item-image.gateway';
import { NpcIdleVideoGateway } from '@app/media/npc-idle-video.gateway';
import { NpcPortraitGateway } from '@app/media/npc-portrait.gateway';
import type { NarrativeItem } from '@app/narrative-item/narrative-item';
import { NarrativeItemService } from '@app/narrative-item/narrative-item.service';
import type { PendingChangesAware } from '@app/navigation/pending-changes.guard';
import type { Npc } from '@app/npc/npc';
import { NpcService } from '@app/npc/npc.service';
import type { Scene, UpdateSceneInput } from '@app/scene/scene';
import { SceneService } from '@app/scene/scene.service';
import { ActiveSceneService } from '@app/scene/active-scene.service';
import { defaultSceneState, SceneDisplayService } from '@app/scene/scene-display.service';
import { JournalEntryList } from '@app/shared/journal-entry-list/journal-entry-list';
import { errorMessage as resolveErrorMessage } from '@app/shared/error-message';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { EmptyState } from '@app/shared/ui/empty-state/empty-state';
import { EntityTitle } from '@app/shared/ui/entity-title/entity-title';
import { FormField } from '@app/shared/ui/form-field/form-field';
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@app/shared/ui/searchable-select/searchable-select';

type PendingDecisionResolver = (canLeave: boolean) => void;

@Component({
  selector: 'app-scene-workspace',
  imports: [
    ReactiveFormsModule,
    JournalEntryList,
    ButtonDirective,
    Dialog,
    EmptyState,
    EntityTitle,
    FormField,
    SearchableSelect,
  ],
  templateUrl: './scene-workspace.html',
  styleUrl: './scene-workspace.scss',
})
export class SceneWorkspace implements OnInit, PendingChangesAware {
  private readonly campaignContext = inject(CampaignContext);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sceneService = inject(SceneService);
  private readonly locationService = inject(LocationService);
  private readonly npcService = inject(NpcService);
  private readonly itemService = inject(NarrativeItemService);
  private readonly activeSceneService = inject(ActiveSceneService);
  private readonly displayGateway = inject(DisplayGateway);
  private readonly displayStore = inject(PlayerDisplayStore);
  private readonly sceneDisplayService = inject(SceneDisplayService);
  private readonly npcPortraitGateway = inject(NpcPortraitGateway);
  private readonly npcIdleVideoGateway = inject(NpcIdleVideoGateway);
  private readonly itemImageGateway = inject(ItemImageGateway);
  private readonly journalEntries = viewChild<JournalEntryList>(JournalEntryList);
  private pendingDecisionResolver?: PendingDecisionResolver;

  protected readonly campaign = this.campaignContext.campaign;
  protected readonly scenes = signal<readonly Scene[]>([]);
  protected readonly locations = signal<readonly Location[]>([]);
  protected readonly npcs = signal<readonly Npc[]>([]);
  protected readonly items = signal<readonly NarrativeItem[]>([]);
  protected readonly selectedScene = signal<Scene | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly isSidebarCollapsed = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly showPendingChangesDialog = signal(false);
  protected readonly showDeleteDialog = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly activeSceneId = signal<string | null>(null);
  protected readonly isPlayerDisplayOpen = signal(false);
  protected readonly isPublishing = signal(false);
  protected readonly focusedJournalEntryId = signal<string | null>(null);
  protected readonly filteredScenes = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('fr');
    return term
      ? this.scenes().filter((scene) =>
          [scene.name, scene.summary].join(' ').toLocaleLowerCase('fr').includes(term),
        )
      : this.scenes();
  });
  protected readonly locationOptions = computed<readonly SearchableSelectOption[]>(() =>
    this.locations().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly npcOptions = computed<readonly SearchableSelectOption[]>(() =>
    this.npcs().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly itemOptions = computed<readonly SearchableSelectOption[]>(() =>
    this.items().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly sceneForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    summary: new FormControl('', { nonNullable: true }),
    locationId: new FormControl<string | null>(null),
    npcIds: new FormControl<readonly string[]>([], { nonNullable: true }),
    itemIds: new FormControl<readonly string[]>([], { nonNullable: true }),
  });

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) =>
        void this.openRequestedScene(params.get('resourceId'), params.get('entryId')),
      );
    void this.initialize();
  }

  canDeactivate(): boolean | Promise<boolean> {
    return this.confirmPendingChanges();
  }

  protected toggleSidebar(): void {
    this.isSidebarCollapsed.update((value) => !value);
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected async requestSelectScene(scene: Scene): Promise<void> {
    if (scene.id === this.selectedScene()?.id && !this.isCreating()) return;
    if (await this.confirmPendingChanges()) this.openReadOnly(scene);
  }

  protected async requestCreateScene(): Promise<void> {
    if (!(await this.confirmPendingChanges())) return;
    this.selectedScene.set(null);
    this.isCreating.set(true);
    this.isEditing.set(true);
    this.sceneForm.reset({ name: '', summary: '', locationId: null, npcIds: [], itemIds: [] });
    this.sceneForm.markAsPristine();
  }

  protected editScene(): void {
    const scene = this.selectedScene();
    if (!scene) return;
    this.isEditing.set(true);
    this.populateForm(scene);
  }

  protected cancelEditing(): void {
    void this.abandonChanges();
  }

  protected async saveScene(): Promise<boolean> {
    if (this.sceneForm.invalid || this.isSaving()) {
      this.sceneForm.markAllAsTouched();
      return false;
    }
    const campaign = this.campaign();
    if (!campaign) return false;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const selected = this.selectedScene();
      const input = this.formInput();
      const saved = this.isCreating()
        ? await this.sceneService.create(campaign.id, input)
        : selected
          ? await this.sceneService.update(selected, input)
          : null;
      if (!saved) return false;
      await this.reloadScenes();
      this.openReadOnly(saved);
      return true;
    } catch (error) {
      this.error.set(errorMessage(error));
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async activateScene(): Promise<void> {
    const campaign = this.campaign();
    const scene = this.selectedScene();
    if (!campaign || !scene || this.isPublishing()) return;
    await this.publish(async () => {
      const state = await this.sceneDisplayService.activate(scene);
      this.activeSceneId.set(scene.id);
      await this.sendState(state);
    });
  }

  protected async deactivateScene(): Promise<void> {
    const campaign = this.campaign();
    const scene = this.selectedScene();
    if (
      !campaign ||
      !scene ||
      this.activeSceneId() !== scene.id ||
      this.isPublishing()
    ) {
      return;
    }
    await this.publish(async () => {
      await this.activeSceneService.clear(campaign.id);
      this.activeSceneId.set(null);
      await this.sendState(defaultSceneState());
    });
  }

  protected async showNpc(npc: Npc): Promise<void> {
    const scene = this.selectedScene();
    if (!scene || !npc.portraitPath || this.isPublishing()) return;
    await this.publish(async () => {
      const state = await this.sceneDisplayService.build(scene, {
        type: 'npc',
        resourceId: npc.id,
        name: npc.name,
        imagePath: await this.npcPortraitGateway.resolveUrl(npc.portraitPath!),
        idleVideoPath: npc.idleVideoPath
          ? await this.npcIdleVideoGateway.resolveUrl(npc.idleVideoPath)
          : undefined,
      });
      await this.sendState(state);
    });
  }

  protected async showItem(item: NarrativeItem): Promise<void> {
    const scene = this.selectedScene();
    if (!scene || !item.imagePath || this.isPublishing()) return;
    await this.publish(async () => {
      await this.sendState(
        await this.sceneDisplayService.build(scene, {
          type: 'item',
          resourceId: item.id,
          name: item.name,
          imagePath: await this.itemImageGateway.resolveUrl(item.imagePath!),
          summary: item.summary,
        }),
      );
    });
  }

  protected async hideForeground(): Promise<void> {
    const scene = this.selectedScene();
    if (!scene || this.isPublishing()) return;
    await this.publish(async () => this.sendState(await this.sceneDisplayService.build(scene)));
  }

  protected requestDeleteScene(): void {
    if (this.selectedScene()) this.showDeleteDialog.set(true);
  }

  protected cancelDelete(): void {
    this.showDeleteDialog.set(false);
  }

  protected async confirmDeleteScene(): Promise<void> {
    const scene = this.selectedScene();
    if (!scene || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const wasActive = this.activeSceneId() === scene.id;
      await this.sceneService.delete(scene);
      if (wasActive) {
        await this.activeSceneService.clear(scene.campaignId);
        this.activeSceneId.set(null);
        await this.sendState(defaultSceneState());
      }
      await this.reloadScenes();
      this.selectedScene.set(null);
      this.showDeleteDialog.set(false);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected locationName(id: string | null): string {
    return id ? (this.locations().find((location) => location.id === id)?.name ?? 'Lieu inconnu') : 'Aucun lieu';
  }

  protected selectedNpcs(scene: Scene): readonly Npc[] {
    return this.npcs().filter((npc) => scene.npcIds.includes(npc.id));
  }

  protected selectedItems(scene: Scene): readonly NarrativeItem[] {
    return this.items().filter((item) => scene.itemIds.includes(item.id));
  }

  protected continueEditing(): void {
    this.resolvePendingDecision(false);
  }

  protected async leaveWithoutSaving(): Promise<void> {
    if (this.journalEntries()?.hasPendingChanges()) this.journalEntries()?.discardPendingChanges();
    if (this.isEditing()) await this.abandonChanges();
    this.resolvePendingDecision(true);
  }

  protected async saveAndLeave(): Promise<void> {
    let saved = true;
    if (this.journalEntries()?.hasPendingChanges()) saved = await this.journalEntries()!.savePendingChanges();
    if (saved && this.isEditing()) saved = await this.saveScene();
    if (saved) this.resolvePendingDecision(true);
  }

  private async initialize(): Promise<void> {
    try {
      const campaign = await this.campaignContext.load();
      if (!campaign) return;
      const [scenes, locations, npcs, items] = await Promise.all([
        this.sceneService.list(campaign.id),
        this.locationService.list(campaign.id),
        this.npcService.list(campaign.id),
        this.itemService.list(campaign.id),
      ]);
      this.scenes.set(scenes);
      this.locations.set(locations);
      this.npcs.set(npcs);
      this.items.set(items);
      this.activeSceneId.set(await this.activeSceneService.get(campaign.id));
      if (this.displayGateway.isDesktop) {
        this.isPlayerDisplayOpen.set(await this.displayGateway.isPlayerDisplayOpen());
      }
      await this.openRequestedScene(
        this.route.snapshot.queryParamMap.get('resourceId'),
        this.route.snapshot.queryParamMap.get('entryId'),
      );
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async openRequestedScene(resourceId: string | null, entryId: string | null): Promise<void> {
    const scene = this.scenes().find(({ id }) => id === resourceId);
    if (!scene || scene.id === this.selectedScene()?.id) return;
    if (!(await this.confirmPendingChanges())) return;
    this.focusedJournalEntryId.set(entryId);
    this.openReadOnly(scene);
  }

  private async reloadScenes(): Promise<void> {
    const campaign = this.campaign();
    if (campaign) this.scenes.set(await this.sceneService.list(campaign.id));
  }

  private async sendState(state: PlayerDisplayState): Promise<void> {
    this.displayStore.setState(state);
    if (this.displayGateway.isDesktop && this.isPlayerDisplayOpen()) {
      await this.displayGateway.sendPlayerDisplayState(state);
    }
  }

  private async publish(action: () => Promise<void>): Promise<void> {
    this.isPublishing.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isPublishing.set(false);
    }
  }

  private openReadOnly(scene: Scene): void {
    const refreshed = this.scenes().find(({ id }) => id === scene.id) ?? scene;
    this.selectedScene.set(refreshed);
    this.isCreating.set(false);
    this.isEditing.set(false);
    this.populateForm(refreshed);
  }

  private populateForm(scene: Scene): void {
    this.sceneForm.reset({
      name: scene.name,
      summary: scene.summary,
      locationId: scene.locationId,
      npcIds: scene.npcIds,
      itemIds: scene.itemIds,
    });
    this.sceneForm.markAsPristine();
  }

  private formInput(): UpdateSceneInput {
    return this.sceneForm.getRawValue();
  }

  private async abandonChanges(): Promise<void> {
    const selected = this.selectedScene();
    this.isEditing.set(false);
    this.isCreating.set(false);
    if (selected) this.populateForm(selected);
    else this.sceneForm.reset({ name: '', summary: '', locationId: null, npcIds: [], itemIds: [] });
  }

  private confirmPendingChanges(): boolean | Promise<boolean> {
    if (!(this.isEditing() && this.sceneForm.dirty) && !this.journalEntries()?.hasPendingChanges()) return true;
    if (this.pendingDecisionResolver) return false;
    this.showPendingChangesDialog.set(true);
    return new Promise((resolve) => (this.pendingDecisionResolver = resolve));
  }

  private resolvePendingDecision(value: boolean): void {
    const resolve = this.pendingDecisionResolver;
    this.pendingDecisionResolver = undefined;
    this.showPendingChangesDialog.set(false);
    resolve?.(value);
  }
}

function errorMessage(error: unknown): string {
  return resolveErrorMessage(error, "Impossible d'enregistrer cette scène.");
}
