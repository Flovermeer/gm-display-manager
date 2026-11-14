import { Component, computed, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { CombatStore } from '@app/features/combat/application/combat.store';
import { npcCombatantSource } from '@app/features/combat/domain/combatant-source';
import { CharacterRuleCatalogService } from '@app/features/game-systems/application/character-rule-catalog.service';
import {
  EMPTY_CHARACTER_RULE_CATALOG,
  type CharacterRuleCatalog,
} from '@app/features/game-systems/domain/character-rule-catalog';
import { NpcListStateService } from '@app/features/npcs/application/npc-list-state.service';
import { NpcWorkspaceFacade } from '@app/features/npcs/application/npc-workspace.facade';
import { groupNpcsByKind } from '@app/features/npcs/domain/npc-list-groups';
import {
  NpcSheetForm,
  type NpcFeatureSectionChange,
} from '@app/features/npcs/ui/npc-sheet-form/npc-sheet-form';
import { NpcSheetView } from '@app/features/npcs/ui/npc-sheet-view/npc-sheet-view';
import {
  createNpcForm,
  emptyNpcFormValue,
  npcFormValueToInput,
  npcToFormValue,
  type NpcFormCatalogs,
} from '@app/features/npcs/pages/npc-workspace/npc-form';
import type { PendingChangesAware } from '@app/core/navigation/pending-changes.guard';
import {
  createEmptyNpcSheet,
  DEMO_NPC_PORTRAIT_URL,
  npcStatusIcon,
  npcStatusLabel,
  type Npc,
  type NpcKind,
  type UpdateNpcInput,
} from '@app/features/npcs/domain/npc';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { JournalEntryList } from '@app/features/journal/ui/journal-entry-list/journal-entry-list';
import { RecentResourceTrackerDirective } from '@app/features/recent-resources/ui/recent-resource-tracker.directive';
import { RecentResourceStore } from '@app/features/recent-resources/application/recent-resource.store';
import type { ResourceMentionCandidate } from '@app/shared/rich-text-editor/resource-mention';
import { ResourceMentionNavigationService } from '@app/shared/rich-text-editor/resource-mention-navigation.service';
import {
  createEmptyRichTextDocument,
  type RichTextDocument,
} from '@app/shared/rich-text-editor/rich-text-document';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { EmptyState } from '@app/shared/ui/empty-state/empty-state';
import { EntityTitle } from '@app/shared/ui/entity-title/entity-title';
import { CreatureRuleCatalogService } from '@app/features/game-systems/application/creature-rule-catalog.service';
import {
  EMPTY_CREATURE_RULE_CATALOG,
  type CreatureRuleCatalog,
} from '@app/features/game-systems/domain/creature-rule-catalog';
import {
  creatureFeatureDraftsFrom,
  emptyCreatureFeatureDrafts,
  type CreatureFeatureDrafts,
} from '@app/shared/ui/rich-text-feature-editor/creature-feature-sections';
import { errorMessage } from '@app/shared/error-message';
import { PendingChangesPrompt } from '@app/core/navigation/pending-changes-prompt';
import { PendingChangesDialog } from '@app/shared/ui/pending-changes-dialog/pending-changes-dialog';

@Component({
  selector: 'app-npc-workspace',
  imports: [
    NpcSheetForm,
    NpcSheetView,
    PendingChangesDialog,
    JournalEntryList,
    ButtonDirective,
    Dialog,
    EmptyState,
    EntityTitle,
    RecentResourceTrackerDirective,
  ],
  templateUrl: './npc-workspace.html',
  styleUrl: './npc-workspace.scss',
})
export class NpcWorkspace implements OnInit, PendingChangesAware {
  private readonly campaignContext = inject(CampaignContext);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly npcService = inject(NpcService);
  private readonly workspace = inject(NpcWorkspaceFacade);
  private readonly npcListState = inject(NpcListStateService);
  private readonly creatureRules = inject(CreatureRuleCatalogService);
  private readonly characterRules = inject(CharacterRuleCatalogService);
  private readonly mentionNavigation = inject(ResourceMentionNavigationService);
  private readonly combat = inject(CombatStore, { optional: true });
  private readonly recentResources = inject(RecentResourceStore, { optional: true });
  private readonly journalEntries = viewChild<JournalEntryList>(JournalEntryList);

  protected readonly campaign = this.campaignContext.campaign;
  protected readonly npcs = signal<readonly Npc[]>([]);
  protected readonly availableNpcs = signal<readonly Npc[]>([]);
  protected readonly selectedNpc = signal<Npc | null>(null);
  protected readonly portraitUrl = signal<string>(DEMO_NPC_PORTRAIT_URL);
  protected readonly draftPortraitPath = signal<string | null>(null);
  protected readonly draftIdleVideoPath = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly isSidebarCollapsed = signal(false);
  protected readonly collapsedNpcGroups = signal<ReadonlySet<NpcKind>>(new Set());
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isImportingPortrait = signal(false);
  protected readonly isImportingVideo = signal(false);
  protected readonly isPublishing = signal(false);
  protected readonly isPlayerDisplayOpen = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly pendingChanges = new PendingChangesPrompt();
  protected readonly showDeleteDialog = signal(false);
  protected readonly showCatalogDialog = signal(false);
  protected readonly showPromotionDialog = signal(false);
  protected readonly showResetDialog = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly focusedJournalEntryId = signal<string | null>(null);
  protected readonly mentionCandidates = signal<readonly ResourceMentionCandidate[]>([]);
  protected readonly statusLabel = npcStatusLabel;
  protected readonly statusIcon = npcStatusIcon;
  protected readonly featureDrafts = signal<CreatureFeatureDrafts>(emptyCreatureFeatureDrafts());
  protected readonly officialDescriptionDraft = signal<RichTextDocument>(
    createEmptyRichTextDocument(),
  );
  protected readonly ruleCatalog = signal<CreatureRuleCatalog>(EMPTY_CREATURE_RULE_CATALOG);
  protected readonly characterRuleCatalog = signal<CharacterRuleCatalog>(
    EMPTY_CHARACTER_RULE_CATALOG,
  );
  protected readonly formCatalogs = computed<NpcFormCatalogs>(() => ({
    creature: this.ruleCatalog(),
    character: this.characterRuleCatalog(),
  }));
  protected readonly effectivePortraitPath = computed(
    () => this.draftPortraitPath() ?? this.selectedNpc()?.portraitPath ?? null,
  );
  protected readonly isUsingDemoPortrait = computed(() => this.effectivePortraitPath() === null);
  protected readonly effectiveIdleVideoPath = computed(
    () => this.draftIdleVideoPath() ?? this.selectedNpc()?.idleVideoPath ?? null,
  );
  protected readonly isSelectedNpcDisplayed = computed(() => {
    const npc = this.selectedNpc();
    return npc !== null && this.workspace.isDisplayed(npc, this.workspace.playerDisplayState());
  });
  protected readonly filteredNpcs = computed(() => {
    const searchTerm = this.searchTerm().trim().toLocaleLowerCase('fr');
    if (!searchTerm) {
      return this.npcs();
    }

    return this.npcs().filter((npc) =>
      [npc.name, npc.summary].some((value) => value.toLocaleLowerCase('fr').includes(searchTerm)),
    );
  });
  protected readonly npcGroups = computed(() => groupNpcsByKind(this.filteredNpcs()));
  protected readonly npcForm = createNpcForm();

  protected addToCombat(npc: Npc): void {
    void this.combat?.requestAdd(npcCombatantSource(npc));
  }

  ngOnInit(): void {
    this.route.queryParamMap
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (params) => void this.openRequestedNpc(params.get('resourceId'), params.get('entryId')),
      );
    void this.initialize();
  }

  canDeactivate(): boolean | Promise<boolean> {
    return this.confirmPendingChanges();
  }

  protected toggleSidebar(): void {
    this.isSidebarCollapsed.update((collapsed) => !collapsed);
  }

  /** Une recherche en cours déplie tous les groupes sans modifier l'état mémorisé. */
  protected isNpcGroupCollapsed(kind: NpcKind): boolean {
    return !this.searchTerm().trim() && this.collapsedNpcGroups().has(kind);
  }

  protected toggleNpcGroup(kind: NpcKind): void {
    const collapsed = new Set(this.collapsedNpcGroups());
    if (!collapsed.delete(kind)) collapsed.add(kind);
    this.collapsedNpcGroups.set(collapsed);

    const campaign = this.campaign();
    if (campaign) {
      void this.npcListState
        .save(campaign.id, collapsed)
        .catch((error: unknown) => this.error.set(errorMessage(error)));
    }
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
    this.populateEmptyForm();
  }

  protected async openCatalog(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign || !(await this.confirmPendingChanges())) return;
    this.availableNpcs.set(await this.npcService.listAvailable(campaign.id));
    this.showCatalogDialog.set(true);
  }

  protected async attachNpc(npc: Npc): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    await this.npcService.attach(campaign.id, npc.id);
    this.showCatalogDialog.set(false);
    await this.reloadNpcs();
    const attached = this.npcs().find(({ id }) => id === npc.id);
    if (attached) this.openReadOnly(attached);
  }

  protected requestPromotion(): void {
    this.showPromotionDialog.set(true);
  }

  protected async confirmPromotion(): Promise<void> {
    const npc = this.selectedNpc();
    if (!npc) return;
    await this.npcService.promote(npc);
    this.showPromotionDialog.set(false);
    await this.reloadNpcs();
    const refreshed = this.npcs().find(({ id }) => id === npc.id);
    if (refreshed) this.openReadOnly(refreshed);
  }

  protected requestReset(): void {
    this.showResetDialog.set(true);
  }

  protected async confirmReset(): Promise<void> {
    const npc = this.selectedNpc();
    if (!npc) return;
    await this.npcService.resetOverride(npc);
    this.showResetDialog.set(false);
    await this.reloadNpcs();
    const refreshed = this.npcs().find(({ id }) => id === npc.id);
    if (refreshed) this.openReadOnly(refreshed);
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
      const imported = await this.workspace.importPortrait(campaign.universeId);
      if (!imported) {
        return;
      }

      const previousDraft = this.draftPortraitPath();
      this.draftPortraitPath.set(imported.path);
      this.portraitUrl.set(imported.url);
      this.npcForm.markAsDirty();
      this.reportErrors(await this.workspace.discardMedia({ portraitPath: previousDraft }));
    } catch (error) {
      this.error.set(errorMessage(error));
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
      const importedPath = await this.workspace.importIdleVideo(campaign.universeId);
      if (!importedPath) return;
      const previousDraft = this.draftIdleVideoPath();
      this.draftIdleVideoPath.set(importedPath);
      this.npcForm.markAsDirty();
      this.reportErrors(await this.workspace.discardMedia({ idleVideoPath: previousDraft }));
    } catch (error) {
      this.error.set(errorMessage(error));
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
      const existing = this.isCreating() ? null : this.selectedNpc();
      if (!this.isCreating() && !existing) {
        return false;
      }

      const savedNpc = await this.workspace.save({
        campaignId: campaign.id,
        existing,
        input: this.formInput(),
        portraitPath: this.effectivePortraitPath(),
        idleVideoPath: this.effectiveIdleVideoPath(),
        isPlayerDisplayOpen: this.isPlayerDisplayOpen(),
      });

      this.draftPortraitPath.set(null);
      this.draftIdleVideoPath.set(null);
      await this.reloadNpcs();
      this.openReadOnly(savedNpc);
      return true;
    } catch (error) {
      this.error.set(errorMessage(error));
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
      await this.workspace.toggleOnPlayerDisplay(npc);
    } catch (error) {
      this.error.set(errorMessage(error));
      this.isPlayerDisplayOpen.set(false);
    } finally {
      this.isPublishing.set(false);
    }
  }

  protected playerDisplayActionTitle(): string {
    if (!this.isPlayerDisplayOpen()) {
      return "Ouvre d'abord l'écran joueurs depuis la régie.";
    }

    return this.isSelectedNpcDisplayed()
      ? "Retirer ce PNJ de l'écran joueurs"
      : "Afficher ce PNJ sur l'écran joueurs";
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
      const cleanupErrors = await this.workspace.delete(npc, this.isPlayerDisplayOpen());
      await this.recentResources?.remove('npc', npc.id);
      this.reportErrors(cleanupErrors);
      await this.reloadNpcs();
      this.selectedNpc.set(null);
      this.portraitUrl.set(DEMO_NPC_PORTRAIT_URL);
      this.showDeleteDialog.set(false);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected continueEditing(): void {
    this.pendingChanges.resolve(false);
  }

  protected async leaveWithoutSaving(): Promise<void> {
    if (this.journalEntries()?.hasPendingChanges()) this.journalEntries()?.discardPendingChanges();
    if (this.isEditing() && this.npcForm.dirty) await this.abandonChanges();
    this.pendingChanges.resolve(true);
  }

  protected async saveAndLeave(): Promise<void> {
    const saved = this.journalEntries()?.hasPendingChanges()
      ? await this.journalEntries()!.savePendingChanges()
      : await this.saveNpc();
    if (saved) {
      this.pendingChanges.resolve(true);
    }
  }

  protected updateFeatureSection({ section, features }: NpcFeatureSectionChange): void {
    this.featureDrafts.update((drafts) => ({ ...drafts, [section]: features }));
    this.npcForm.markAsDirty();
  }

  protected updateOfficialDescription(description: RichTextDocument): void {
    this.officialDescriptionDraft.set(description);
    this.npcForm.markAsDirty();
  }

  protected openMention(mention: ResourceMentionCandidate): void {
    const campaign = this.campaign();
    if (campaign) void this.mentionNavigation.open(campaign.id, mention);
  }

  private async initialize(): Promise<void> {
    try {
      const campaign = await this.campaignContext.load();
      if (!campaign) return;
      await this.loadSupportingCatalogs();
      await this.reloadNpcs();
      this.collapsedNpcGroups.set(await this.npcListState.load(campaign.id));
      await this.openRequestedNpc(
        this.route.snapshot.queryParamMap?.get('resourceId'),
        this.route.snapshot.queryParamMap?.get('entryId'),
      );
      this.isPlayerDisplayOpen.set(await this.workspace.isPlayerDisplayOpen());
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async openRequestedNpc(resourceId: string | null, entryId: string | null): Promise<void> {
    const requested = this.npcs().find(({ id }) => id === resourceId);
    if (!requested || requested.id === this.selectedNpc()?.id) return;
    if (!(await this.confirmPendingChanges())) return;
    this.focusedJournalEntryId.set(entryId);
    this.openReadOnly(requested);
  }

  private async reloadNpcs(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    // Les mentions sont relues avec la liste : un PNJ créé ou renommé doit être proposé
    // dans le menu « @ » sans quitter la page.
    const [npcs, mentionCandidates] = await Promise.all([
      this.npcService.list(campaign.id),
      this.mentionNavigation.listCandidates(campaign.id),
    ]);
    this.npcs.set(npcs);
    this.mentionCandidates.set(mentionCandidates);
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
    this.npcForm.reset(npcToFormValue(npc, this.formCatalogs()));
    this.featureDrafts.set(creatureFeatureDraftsFrom(npc.sheet));
    this.officialDescriptionDraft.set(npc.sheet.officialDescription);
    this.npcForm.markAsPristine();
  }

  private populateEmptyForm(): void {
    this.npcForm.reset(emptyNpcFormValue());
    this.featureDrafts.set(emptyCreatureFeatureDrafts());
    this.officialDescriptionDraft.set(createEmptyNpcSheet().officialDescription);
    this.npcForm.markAsPristine();
  }

  private async abandonChanges(): Promise<void> {
    const draftPortraitPath = this.draftPortraitPath();
    const draftIdleVideoPath = this.draftIdleVideoPath();
    this.draftPortraitPath.set(null);
    this.draftIdleVideoPath.set(null);
    this.reportErrors(
      await this.workspace.discardMedia({
        portraitPath: draftPortraitPath,
        idleVideoPath: draftIdleVideoPath,
      }),
    );

    const selectedNpc = this.selectedNpc();
    this.isEditing.set(false);
    this.isCreating.set(false);
    if (selectedNpc) {
      this.populateForm(selectedNpc);
      await this.loadPortraitPreview(selectedNpc.portraitPath);
    } else {
      this.populateEmptyForm();
      this.portraitUrl.set(DEMO_NPC_PORTRAIT_URL);
    }
  }

  private formInput(): UpdateNpcInput {
    return npcFormValueToInput(this.npcForm.getRawValue(), this.formCatalogs(), {
      previousSheet: this.selectedNpc()?.sheet ?? createEmptyNpcSheet(),
      officialDescription: this.officialDescriptionDraft(),
      features: this.featureDrafts(),
    });
  }

  private async loadSupportingCatalogs(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    const [creatureCatalog, characterCatalog] = await Promise.all([
      this.creatureRules.loadForUniverse(campaign.universeId),
      this.characterRules.loadForUniverse(campaign.universeId),
    ]);
    this.ruleCatalog.set(creatureCatalog);
    this.characterRuleCatalog.set(characterCatalog);
  }

  private async loadPortraitPreview(relativePath: string | null): Promise<void> {
    this.portraitUrl.set(DEMO_NPC_PORTRAIT_URL);
    if (!relativePath) {
      return;
    }

    try {
      const url = await this.workspace.portraitUrl(relativePath);
      if (this.effectivePortraitPath() === relativePath) {
        this.portraitUrl.set(url);
      }
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private reportErrors(errors: readonly unknown[]): void {
    const lastError = errors.at(-1);
    if (lastError !== undefined) this.error.set(errorMessage(lastError));
  }

  private confirmPendingChanges(): boolean | Promise<boolean> {
    if (!(this.isEditing() && this.npcForm.dirty) && !this.journalEntries()?.hasPendingChanges()) {
      return true;
    }

    return this.pendingChanges.request();
  }
}
