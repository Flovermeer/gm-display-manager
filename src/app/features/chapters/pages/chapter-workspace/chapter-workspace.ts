import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { JSONContent } from '@tiptap/core';

import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import { PlayerDisplayStore } from '@app/features/display/application/player-display.store';
import {
  emptyChapterInput,
  type Chapter,
  type UpdateChapterInput,
} from '@app/features/chapters/domain/chapter';
import { ChapterService } from '@app/features/chapters/application/chapter.service';
import { LocationService } from '@app/features/locations/application/location.service';
import type { PendingChangesAware } from '@app/core/navigation/pending-changes.guard';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { PlayerCharacterService } from '@app/features/players/application/player-character.service';
import { SceneService } from '@app/features/scenes/application/scene.service';
import { ActiveSceneService } from '@app/features/scenes/application/active-scene.service';
import { defaultSceneState } from '@app/features/scenes/application/scene-display.service';
import type { Scene } from '@app/features/scenes/domain/scene';
import { RecentResourceTrackerDirective } from '@app/features/recent-resources/ui/recent-resource-tracker.directive';
import { RecentResourceStore } from '@app/features/recent-resources/application/recent-resource.store';
import type { RichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';
import type { ResourceMentionCandidate } from '@app/shared/rich-text-editor/resource-mention';
import { ResourceMentionNavigationService } from '@app/shared/rich-text-editor/resource-mention-navigation.service';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { EmptyState } from '@app/shared/ui/empty-state/empty-state';
import { EntityTitle } from '@app/shared/ui/entity-title/entity-title';
import { FormField } from '@app/shared/ui/form-field/form-field';
import {
  ChapterSceneList,
  type ChapterSceneCandidate,
} from '@app/features/chapters/ui/chapter-scene-list/chapter-scene-list';

type PendingDecisionResolver = (canLeave: boolean) => void;

@Component({
  selector: 'app-chapter-workspace',
  imports: [
    ReactiveFormsModule,
    RichTextEditor,
    ButtonDirective,
    Dialog,
    EmptyState,
    EntityTitle,
    FormField,
    RecentResourceTrackerDirective,
    ChapterSceneList,
  ],
  templateUrl: './chapter-workspace.html',
  styleUrl: './chapter-workspace.scss',
})
export class ChapterWorkspace implements OnInit, PendingChangesAware {
  private readonly campaignContext = inject(CampaignContext);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly chapterService = inject(ChapterService);
  private readonly sceneService = inject(SceneService);
  private readonly activeSceneService = inject(ActiveSceneService);
  private readonly displayGateway = inject(DisplayGateway);
  private readonly displayStore = inject(PlayerDisplayStore);
  private readonly locationService = inject(LocationService);
  private readonly npcService = inject(NpcService);
  private readonly characterService = inject(PlayerCharacterService);
  private readonly mentionNavigation = inject(ResourceMentionNavigationService);
  private readonly recentResources = inject(RecentResourceStore, { optional: true });
  private pendingDecisionResolver?: PendingDecisionResolver;

  protected readonly campaign = this.campaignContext.campaign;
  protected readonly chapters = signal<readonly Chapter[]>([]);
  protected readonly scenes = signal<readonly Scene[]>([]);
  protected readonly selectedChapter = signal<Chapter | null>(null);
  protected readonly draftContent = signal<RichTextDocument>(emptyChapterInput().content);
  protected readonly contentDirty = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly isSidebarCollapsed = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly showPendingChangesDialog = signal(false);
  protected readonly showDeleteDialog = signal(false);
  protected readonly pendingSceneMove = signal<Scene | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly mentionCandidates = signal<readonly ResourceMentionCandidate[]>([]);

  protected readonly chapterForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    summary: new FormControl('', { nonNullable: true }),
  });

  protected readonly filteredChapters = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('fr');
    if (!term) return this.chapters();
    return this.chapters().filter((chapter) =>
      [chapter.title, chapter.summary, richTextAsPlainText(chapter.content.content)].some((value) =>
        value.toLocaleLowerCase('fr').includes(term),
      ),
    );
  });
  protected readonly selectedChapterIndex = computed(() => {
    const selectedId = this.selectedChapter()?.id;
    return selectedId ? this.chapters().findIndex((chapter) => chapter.id === selectedId) : -1;
  });
  protected readonly canMoveChapterUp = computed(() => this.selectedChapterIndex() > 0);
  protected readonly canMoveChapterDown = computed(() => {
    const index = this.selectedChapterIndex();
    return index >= 0 && index < this.chapters().length - 1;
  });
  protected readonly selectedChapterScenes = computed(() => {
    const chapterId = this.selectedChapter()?.id;
    return chapterId
      ? this.scenes()
          .filter((scene) => scene.chapterId === chapterId)
          .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
      : [];
  });
  protected readonly sceneCandidates = computed<readonly ChapterSceneCandidate[]>(() => {
    const chapterId = this.selectedChapter()?.id;
    return this.scenes()
      .filter((scene) => scene.chapterId !== chapterId)
      .map((scene) => ({
        scene,
        chapterTitle:
          this.chapters().find((chapter) => chapter.id === scene.chapterId)?.title ??
          'Chapitre inconnu',
      }));
  });

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => void this.openRequestedChapter(params.get('resourceId')));
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

  protected async requestSelectChapter(chapter: Chapter): Promise<void> {
    if (chapter.id === this.selectedChapter()?.id && !this.isCreating()) return;
    if (await this.confirmPendingChanges()) this.openReadOnly(chapter);
  }

  protected async requestCreateChapter(): Promise<void> {
    if (!(await this.confirmPendingChanges())) return;
    const input = emptyChapterInput();
    this.selectedChapter.set(null);
    this.isCreating.set(true);
    this.isEditing.set(true);
    this.chapterForm.reset({ title: '', summary: '' });
    this.chapterForm.markAsPristine();
    this.draftContent.set(input.content);
    this.contentDirty.set(false);
  }

  protected editChapter(): void {
    const chapter = this.selectedChapter();
    if (!chapter) return;
    this.isCreating.set(false);
    this.isEditing.set(true);
    this.populateDraft(chapter);
  }

  protected updateContent(content: RichTextDocument): void {
    if (!this.isEditing()) return;
    this.draftContent.set(content);
    this.contentDirty.set(true);
  }

  protected openMention(mention: ResourceMentionCandidate): void {
    const campaign = this.campaign();
    if (campaign) void this.mentionNavigation.open(campaign.id, mention);
  }

  protected cancelEditing(): void {
    void this.abandonChanges();
  }

  protected async saveChapter(): Promise<boolean> {
    if (this.chapterForm.invalid || this.isSaving()) {
      this.chapterForm.markAllAsTouched();
      return false;
    }
    const campaign = this.campaign();
    if (!campaign) return false;

    this.isSaving.set(true);
    this.error.set(null);
    try {
      const selected = this.selectedChapter();
      const saved = this.isCreating()
        ? await this.chapterService.create(campaign.id, this.formInput())
        : selected
          ? await this.chapterService.update(selected, this.formInput())
          : null;
      if (!saved) return false;
      await this.reloadChapters();
      this.openReadOnly(saved);
      return true;
    } catch (error) {
      this.error.set(errorMessage(error));
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async moveSelectedChapter(direction: -1 | 1): Promise<void> {
    const chapter = this.selectedChapter();
    if (
      !chapter ||
      this.isSaving() ||
      (direction === -1 && !this.canMoveChapterUp()) ||
      (direction === 1 && !this.canMoveChapterDown())
    ) {
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);
    try {
      const movedChapter = await this.chapterService.move(chapter, direction);
      await this.reloadChapters();
      this.openReadOnly(movedChapter);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected requestDeleteChapter(): void {
    if (this.selectedChapter()) this.showDeleteDialog.set(true);
  }

  protected createSceneForChapter(): void {
    const campaign = this.campaign();
    const chapter = this.selectedChapter();
    if (!campaign || !chapter) return;
    void this.router.navigate(['/campaigns', campaign.id, 'scenes'], {
      queryParams: {
        create: 'true',
        chapterId: chapter.id,
        returnChapterId: chapter.id,
      },
    });
  }

  protected openScene(scene: Scene): void {
    const campaign = this.campaign();
    const chapter = this.selectedChapter();
    if (!campaign || !chapter) return;
    void this.router.navigate(['/campaigns', campaign.id, 'scenes'], {
      queryParams: { resourceId: scene.id, returnChapterId: chapter.id },
    });
  }

  protected requestMoveScene(scene: Scene): void {
    if (scene.chapterId !== this.selectedChapter()?.id) this.pendingSceneMove.set(scene);
  }

  protected async confirmMoveScene(): Promise<void> {
    const scene = this.pendingSceneMove();
    const chapter = this.selectedChapter();
    if (!scene || !chapter || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      await this.sceneService.moveToChapter(scene, chapter.id);
      await this.reloadScenes();
      this.pendingSceneMove.set(null);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async moveScene(event: Readonly<{ scene: Scene; direction: -1 | 1 }>): Promise<void> {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      await this.sceneService.move(event.scene, event.direction);
      await this.reloadScenes();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected cancelDelete(): void {
    this.showDeleteDialog.set(false);
  }

  protected async confirmDeleteChapter(): Promise<void> {
    const chapter = this.selectedChapter();
    if (!chapter || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const scenes = this.selectedChapterScenes();
      const activeSceneId = await this.activeSceneService.get(chapter.campaignId);
      await this.chapterService.delete(chapter);
      await Promise.all(scenes.map((scene) => this.sceneService.delete(scene)));
      await Promise.all(scenes.map((scene) => this.recentResources?.remove('scene', scene.id)));
      if (scenes.some(({ id }) => id === activeSceneId)) {
        const state = defaultSceneState();
        await this.activeSceneService.clear(chapter.campaignId);
        this.displayStore.setState(state);
        if (this.displayGateway.isDesktop && (await this.displayGateway.isPlayerDisplayOpen())) {
          await this.displayGateway.sendPlayerDisplayState(state);
        }
      }
      await this.recentResources?.remove('chapter', chapter.id);
      await Promise.all([this.reloadChapters(), this.reloadScenes()]);
      this.selectedChapter.set(null);
      this.showDeleteDialog.set(false);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected continueEditing(): void {
    this.resolvePendingDecision(false);
  }

  protected leaveWithoutSaving(): void {
    void this.abandonChanges().then(() => this.resolvePendingDecision(true));
  }

  protected async saveAndLeave(): Promise<void> {
    if (await this.saveChapter()) this.resolvePendingDecision(true);
  }

  private async initialize(): Promise<void> {
    try {
      const campaign = await this.campaignContext.load();
      if (!campaign) return;
      const [chapters, scenes, locations, npcs, characters] = await Promise.all([
        this.chapterService.list(campaign.id),
        this.sceneService.list(campaign.id),
        this.locationService.list(campaign.id),
        this.npcService.list(campaign.id),
        this.characterService.list(campaign.id),
      ]);
      this.chapters.set(chapters);
      this.scenes.set(scenes);
      this.mentionCandidates.set([
        ...characters.map((character) => ({
          resourceType: 'player-character' as const,
          resourceId: character.id,
          label: character.name,
        })),
        ...npcs.map((npc) => ({
          resourceType: 'npc' as const,
          resourceId: npc.id,
          label: npc.name,
        })),
        ...locations.map((location) => ({
          resourceType: 'location' as const,
          resourceId: location.id,
          label: location.name,
        })),
      ]);
      await this.openRequestedChapter(this.route.snapshot.queryParamMap.get('resourceId'));
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async reloadChapters(): Promise<void> {
    const campaign = this.campaign();
    if (campaign) this.chapters.set(await this.chapterService.list(campaign.id));
  }

  private async reloadScenes(): Promise<void> {
    const campaign = this.campaign();
    if (campaign) this.scenes.set(await this.sceneService.list(campaign.id));
  }

  private async openRequestedChapter(resourceId: string | null): Promise<void> {
    const requested = this.chapters().find(({ id }) => id === resourceId);
    if (!requested || requested.id === this.selectedChapter()?.id) return;
    if (!(await this.confirmPendingChanges())) return;
    this.openReadOnly(requested);
  }

  private openReadOnly(chapter: Chapter): void {
    const refreshed = this.chapters().find((candidate) => candidate.id === chapter.id) ?? chapter;
    this.selectedChapter.set(refreshed);
    this.isCreating.set(false);
    this.isEditing.set(false);
    this.populateDraft(refreshed);
  }

  private populateDraft(chapter: Chapter): void {
    this.chapterForm.reset({ title: chapter.title, summary: chapter.summary });
    this.chapterForm.markAsPristine();
    this.draftContent.set(chapter.content);
    this.contentDirty.set(false);
  }

  private formInput(): UpdateChapterInput {
    const value = this.chapterForm.getRawValue();
    return { title: value.title, summary: value.summary, content: this.draftContent() };
  }

  private abandonChanges(): Promise<void> {
    const selected = this.selectedChapter();
    this.isEditing.set(false);
    this.isCreating.set(false);
    if (selected) this.populateDraft(selected);
    else {
      this.chapterForm.reset({ title: '', summary: '' });
      this.draftContent.set(emptyChapterInput().content);
      this.contentDirty.set(false);
    }
    return Promise.resolve();
  }

  private confirmPendingChanges(): boolean | Promise<boolean> {
    if (!this.isEditing() || (!this.chapterForm.dirty && !this.contentDirty())) return true;
    if (this.pendingDecisionResolver) return false;
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
}

function richTextAsPlainText(node: JSONContent): string {
  const ownText = node.text ?? '';
  return [ownText, ...(node.content ?? []).map(richTextAsPlainText)].join(' ');
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Une erreur inattendue est survenue.';
}
