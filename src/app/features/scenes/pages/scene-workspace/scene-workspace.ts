import { Component, computed, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { JSONContent } from '@tiptap/core';

import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { ChapterService } from '@app/features/chapters/application/chapter.service';
import type { Chapter } from '@app/features/chapters/domain/chapter';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import type { PlayerDisplayState } from '@app/features/display/domain/player-display-state';
import { PlayerDisplayStore } from '@app/features/display/application/player-display.store';
import type { Location } from '@app/features/locations/domain/location';
import { LocationService } from '@app/features/locations/application/location.service';
import { ItemImageGateway } from '@app/features/items/data-access/item-image.gateway';
import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';
import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';
import type { NarrativeItem } from '@app/features/items/domain/narrative-item';
import { NarrativeItemService } from '@app/features/items/application/narrative-item.service';
import type { PendingChangesAware } from '@app/core/navigation/pending-changes.guard';
import type { Npc } from '@app/features/npcs/domain/npc';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { MonsterService } from '@app/features/bestiary/application/monster.service';
import type { Monster } from '@app/features/bestiary/domain/monster';
import {
  emptySceneInput,
  type Scene,
  type UpdateSceneInput,
} from '@app/features/scenes/domain/scene';
import { SceneService } from '@app/features/scenes/application/scene.service';
import { ActiveSceneService } from '@app/features/scenes/application/active-scene.service';
import {
  defaultSceneState,
  SceneDisplayService,
} from '@app/features/scenes/application/scene-display.service';
import { JournalEntryList } from '@app/features/journal/ui/journal-entry-list/journal-entry-list';
import { RecentResourceTrackerDirective } from '@app/features/recent-resources/ui/recent-resource-tracker.directive';
import { RecentResourceStore } from '@app/features/recent-resources/application/recent-resource.store';
import { errorMessage as resolveErrorMessage } from '@app/shared/error-message';
import type { RichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';
import type { ResourceMentionCandidate } from '@app/shared/rich-text-editor/resource-mention';
import { ResourceMentionNavigationService } from '@app/shared/rich-text-editor/resource-mention-navigation.service';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { EmptyState } from '@app/shared/ui/empty-state/empty-state';
import { EntityTitle } from '@app/shared/ui/entity-title/entity-title';
import { FormField, type FormFieldOption } from '@app/shared/ui/form-field/form-field';
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
    RecentResourceTrackerDirective,
    RichTextEditor,
  ],
  templateUrl: './scene-workspace.html',
  styleUrl: './scene-workspace.scss',
})
export class SceneWorkspace implements OnInit, PendingChangesAware {
  private readonly campaignContext = inject(CampaignContext);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sceneService = inject(SceneService);
  private readonly chapterService = inject(ChapterService);
  private readonly locationService = inject(LocationService);
  private readonly npcService = inject(NpcService);
  private readonly monsterService = inject(MonsterService);
  private readonly itemService = inject(NarrativeItemService);
  private readonly activeSceneService = inject(ActiveSceneService);
  private readonly displayGateway = inject(DisplayGateway);
  private readonly displayStore = inject(PlayerDisplayStore);
  private readonly sceneDisplayService = inject(SceneDisplayService);
  private readonly npcPortraitGateway = inject(NpcPortraitGateway);
  private readonly npcIdleVideoGateway = inject(NpcIdleVideoGateway);
  private readonly itemImageGateway = inject(ItemImageGateway);
  private readonly recentResources = inject(RecentResourceStore, { optional: true });
  private readonly mentionNavigation = inject(ResourceMentionNavigationService);
  private readonly journalEntries = viewChild<JournalEntryList>(JournalEntryList);
  private pendingDecisionResolver?: PendingDecisionResolver;

  protected readonly campaign = this.campaignContext.campaign;
  protected readonly scenes = signal<readonly Scene[]>([]);
  protected readonly chapters = signal<readonly Chapter[]>([]);
  protected readonly locations = signal<readonly Location[]>([]);
  protected readonly npcs = signal<readonly Npc[]>([]);
  protected readonly monsters = signal<readonly Monster[]>([]);
  protected readonly items = signal<readonly NarrativeItem[]>([]);
  protected readonly selectedScene = signal<Scene | null>(null);
  protected readonly descriptionDraft = signal<RichTextDocument>(emptySceneInput().description);
  protected readonly descriptionDirty = signal(false);
  protected readonly mentionCandidates = signal<readonly ResourceMentionCandidate[]>([]);
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
  protected readonly fixedChapterId = signal<string | null>(null);
  protected readonly returnChapterId = signal<string | null>(null);
  protected readonly filteredScenes = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('fr');
    return term
      ? this.scenes().filter((scene) =>
          [scene.name, scene.summary, richTextAsPlainText(scene.description.content)]
            .join(' ')
            .toLocaleLowerCase('fr')
            .includes(term),
        )
      : this.scenes();
  });
  protected readonly locationOptions = computed<readonly SearchableSelectOption[]>(() =>
    this.locations().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly npcOptions = computed<readonly SearchableSelectOption[]>(() =>
    this.npcs().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly monsterOptions = computed<readonly SearchableSelectOption[]>(() =>
    this.monsters().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly itemOptions = computed<readonly SearchableSelectOption[]>(() =>
    this.items().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly chapterOptions = computed<readonly FormFieldOption[]>(() =>
    this.chapters().map(({ id, title }) => ({ value: id, label: title })),
  );
  protected readonly sceneForm = new FormGroup({
    chapterId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    summary: new FormControl('', { nonNullable: true }),
    locationId: new FormControl<string | null>(null),
    npcIds: new FormControl<readonly string[]>([], { nonNullable: true }),
    monsterIds: new FormControl<readonly string[]>([], { nonNullable: true }),
    itemIds: new FormControl<readonly string[]>([], { nonNullable: true }),
  });

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.returnChapterId.set(params.get('returnChapterId'));
      void this.openRequestedScene(params.get('resourceId'), params.get('entryId'));
    });
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

  protected async requestCreateScene(chapterId: string | null = null): Promise<void> {
    if (this.chapters().length === 0) {
      this.error.set('Crée un chapitre avant de préparer une scène.');
      return;
    }
    if (!(await this.confirmPendingChanges())) return;
    const fixedChapter = this.chapters().find(({ id }) => id === chapterId)?.id ?? null;
    this.selectedScene.set(null);
    this.fixedChapterId.set(fixedChapter);
    this.isCreating.set(true);
    this.isEditing.set(true);
    this.sceneForm.reset({
      chapterId: fixedChapter ?? '',
      name: '',
      summary: '',
      locationId: null,
      npcIds: [],
      monsterIds: [],
      itemIds: [],
    });
    this.sceneForm.markAsPristine();
    this.descriptionDraft.set(emptySceneInput().description);
    this.descriptionDirty.set(false);
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

  protected updateDescription(description: RichTextDocument): void {
    if (!this.isEditing()) return;
    this.descriptionDraft.set(description);
    this.descriptionDirty.set(true);
  }

  protected openMention(mention: ResourceMentionCandidate): void {
    const campaign = this.campaign();
    if (campaign) void this.mentionNavigation.open(campaign.id, mention);
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
      const wasCreating = this.isCreating();
      const saved = wasCreating
        ? await this.sceneService.create(
            campaign.id,
            this.sceneForm.controls.chapterId.value,
            input,
          )
        : selected
          ? await this.sceneService.update(selected, input)
          : null;
      if (!saved) return false;
      await this.reloadScenes();
      const returnChapterId = this.returnChapterId();
      if (wasCreating && returnChapterId) {
        this.sceneForm.markAsPristine();
        this.isCreating.set(false);
        this.isEditing.set(false);
        await this.router.navigate(['/campaigns', campaign.id, 'chapters'], {
          queryParams: { resourceId: returnChapterId },
        });
        return true;
      }
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
      if (this.isSceneDisplayed(scene)) {
        await this.clearActiveScene(campaign.id);
        return;
      }
      const state = await this.sceneDisplayService.activate(scene);
      this.activeSceneId.set(scene.id);
      await this.sendState(state);
    });
  }

  protected async showNpc(npc: Npc): Promise<void> {
    const scene = this.selectedScene();
    if (!scene || !npc.portraitPath || this.isPublishing()) return;
    await this.publish(async () => {
      if (this.isNpcDisplayed(scene, npc)) {
        await this.clearActiveScene(scene.campaignId);
        return;
      }
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
      if (this.isItemDisplayed(scene, item)) {
        await this.clearActiveScene(scene.campaignId);
        return;
      }
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

  protected isSceneDisplayed(scene: Scene): boolean {
    const state = this.displayStore.state();
    return state.mode === 'scene' && state.sceneId === scene.id;
  }

  protected isNpcDisplayed(scene: Scene, npc: Npc): boolean {
    const state = this.displayStore.state();
    return (
      state.mode === 'scene' &&
      state.sceneId === scene.id &&
      state.foreground?.type === 'npc' &&
      state.foreground.resourceId === npc.id
    );
  }

  protected isItemDisplayed(scene: Scene, item: NarrativeItem): boolean {
    const state = this.displayStore.state();
    return (
      state.mode === 'scene' &&
      state.sceneId === scene.id &&
      state.foreground?.type === 'item' &&
      state.foreground.resourceId === item.id
    );
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
      await this.recentResources?.remove('scene', scene.id);
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
    return id
      ? (this.locations().find((location) => location.id === id)?.name ?? 'Lieu inconnu')
      : 'Aucun lieu';
  }

  protected chapterName(id: string): string {
    return this.chapters().find((chapter) => chapter.id === id)?.title ?? 'Chapitre inconnu';
  }

  protected returnToChapter(): void {
    const campaign = this.campaign();
    const chapterId = this.returnChapterId();
    if (campaign && chapterId) {
      void this.router.navigate(['/campaigns', campaign.id, 'chapters'], {
        queryParams: { resourceId: chapterId },
      });
    }
  }

  protected selectedNpcs(scene: Scene): readonly Npc[] {
    return this.npcs().filter((npc) => scene.npcIds.includes(npc.id));
  }

  protected selectedItems(scene: Scene): readonly NarrativeItem[] {
    return this.items().filter((item) => scene.itemIds.includes(item.id));
  }

  protected selectedMonsters(scene: Scene): readonly Monster[] {
    return this.monsters().filter((monster) => scene.monsterIds.includes(monster.id));
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
    if (this.journalEntries()?.hasPendingChanges())
      saved = await this.journalEntries()!.savePendingChanges();
    if (saved && this.isEditing()) saved = await this.saveScene();
    if (saved) this.resolvePendingDecision(true);
  }

  private async initialize(): Promise<void> {
    try {
      const campaign = await this.campaignContext.load();
      if (!campaign) return;
      const [scenes, chapters, locations, npcs, monsters, items, mentionCandidates] =
        await Promise.all([
          this.sceneService.list(campaign.id),
          this.chapterService.list(campaign.id),
          this.locationService.list(campaign.id),
          this.npcService.list(campaign.id),
          this.monsterService.list(campaign.id),
          this.itemService.list(campaign.id),
          this.mentionNavigation.listCandidates(campaign.id),
        ]);
      this.scenes.set(scenes);
      this.chapters.set(chapters);
      this.locations.set(locations);
      this.npcs.set(npcs);
      this.monsters.set(monsters);
      this.items.set(items);
      this.mentionCandidates.set(mentionCandidates);
      this.activeSceneId.set(await this.activeSceneService.get(campaign.id));
      if (this.displayGateway.isDesktop) {
        this.isPlayerDisplayOpen.set(await this.displayGateway.isPlayerDisplayOpen());
      }
      const queryParams = this.route.snapshot.queryParamMap;
      this.returnChapterId.set(queryParams.get('returnChapterId'));
      if (queryParams.get('create') === 'true') {
        await this.requestCreateScene(queryParams.get('chapterId'));
      } else {
        await this.openRequestedScene(queryParams.get('resourceId'), queryParams.get('entryId'));
      }
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async openRequestedScene(
    resourceId: string | null,
    entryId: string | null,
  ): Promise<void> {
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

  private async clearActiveScene(campaignId: string): Promise<void> {
    await this.activeSceneService.clear(campaignId);
    this.activeSceneId.set(null);
    await this.sendState(defaultSceneState());
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
    this.fixedChapterId.set(null);
    this.isCreating.set(false);
    this.isEditing.set(false);
    this.populateForm(refreshed);
  }

  private populateForm(scene: Scene): void {
    this.sceneForm.reset({
      chapterId: scene.chapterId,
      name: scene.name,
      summary: scene.summary,
      locationId: scene.locationId,
      npcIds: scene.npcIds,
      monsterIds: scene.monsterIds,
      itemIds: scene.itemIds,
    });
    this.sceneForm.markAsPristine();
    this.descriptionDraft.set(scene.description);
    this.descriptionDirty.set(false);
  }

  private formInput(): UpdateSceneInput {
    const { chapterId: _chapterId, ...input } = this.sceneForm.getRawValue();
    return { ...input, description: this.descriptionDraft() };
  }

  private async abandonChanges(): Promise<void> {
    const selected = this.selectedScene();
    this.isEditing.set(false);
    this.isCreating.set(false);
    if (selected) this.populateForm(selected);
    else {
      this.sceneForm.reset({
        chapterId: '',
        name: '',
        summary: '',
        locationId: null,
        npcIds: [],
        monsterIds: [],
        itemIds: [],
      });
      this.descriptionDraft.set(emptySceneInput().description);
      this.descriptionDirty.set(false);
    }
  }

  private confirmPendingChanges(): boolean | Promise<boolean> {
    if (
      !(this.isEditing() && (this.sceneForm.dirty || this.descriptionDirty())) &&
      !this.journalEntries()?.hasPendingChanges()
    )
      return true;
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

function richTextAsPlainText(node: JSONContent): string {
  const ownText = node.text ?? '';
  return [ownText, ...(node.content ?? []).map(richTextAsPlainText)].join(' ');
}

function errorMessage(error: unknown): string {
  return resolveErrorMessage(error, "Impossible d'enregistrer cette scène.");
}
