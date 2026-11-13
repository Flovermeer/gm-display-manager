import { Component, computed, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { PlayerDisplayPublisher } from '@app/features/display/application/player-display-publisher.service';
import { isDisplayingResource } from '@app/features/display/domain/player-display-state';
import { LocationService } from '@app/features/locations/application/location.service';
import { ItemImageGateway } from '@app/features/items/data-access/item-image.gateway';
import type { PendingChangesAware } from '@app/core/navigation/pending-changes.guard';
import {
  emptyNarrativeItemInput,
  itemPlayerDisplayState,
  NARRATIVE_ITEM_STATUSES,
  type AttunementMode,
  type ItemOwner,
  type ItemOwnerType,
  type NarrativeItem,
  type NarrativeItemStatus,
  type UpdateNarrativeItemInput,
} from '@app/features/items/domain/narrative-item';
import type { ItemConfigurationOption } from '@app/features/items/domain/item-configuration';
import { ItemConfigurationService } from '@app/features/items/application/item-configuration.service';
import { NarrativeItemService } from '@app/features/items/application/narrative-item.service';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { PlayerCharacterService } from '@app/features/players/application/player-character.service';
import { JournalEntryList } from '@app/features/journal/ui/journal-entry-list/journal-entry-list';
import { RecentResourceTrackerDirective } from '@app/features/recent-resources/ui/recent-resource-tracker.directive';
import { RecentResourceStore } from '@app/features/recent-resources/application/recent-resource.store';
import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';
import { ResourceMentionNavigationService } from '@app/shared/rich-text-editor/resource-mention-navigation.service';
import type { ResourceMentionCandidate } from '@app/shared/rich-text-editor/resource-mention';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { EmptyState } from '@app/shared/ui/empty-state/empty-state';
import { EntityTitle } from '@app/shared/ui/entity-title/entity-title';
import { FormField, type FormFieldOption } from '@app/shared/ui/form-field/form-field';
import { errorMessage } from '@app/shared/error-message';
import { PendingChangesPrompt } from '@app/core/navigation/pending-changes-prompt';
import { PendingChangesDialog } from '@app/shared/ui/pending-changes-dialog/pending-changes-dialog';

const ERROR_FALLBACK = "Impossible d'enregistrer cet objet.";

type OwnerOption = Readonly<{ resourceType: ItemOwnerType; resourceId: string; label: string }>;

const DEMO_ITEM_IMAGE_URL = '/demo/item-placeholder.svg';

@Component({
  selector: 'app-narrative-item-workspace',
  imports: [
    PendingChangesDialog,
    ReactiveFormsModule,
    JournalEntryList,
    RichTextEditor,
    ButtonDirective,
    Dialog,
    EmptyState,
    EntityTitle,
    FormField,
    RecentResourceTrackerDirective,
  ],
  templateUrl: './narrative-item-workspace.html',
  styleUrl: './narrative-item-workspace.scss',
})
export class NarrativeItemWorkspace implements OnInit, PendingChangesAware {
  private readonly campaignContext = inject(CampaignContext);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly itemService = inject(NarrativeItemService);
  private readonly configurationService = inject(ItemConfigurationService);
  private readonly npcService = inject(NpcService);
  private readonly locationService = inject(LocationService);
  private readonly characterService = inject(PlayerCharacterService);
  private readonly imageGateway = inject(ItemImageGateway);
  private readonly playerDisplay = inject(PlayerDisplayPublisher);
  private readonly mentionNavigation = inject(ResourceMentionNavigationService);
  private readonly recentResources = inject(RecentResourceStore, { optional: true });
  private readonly journalEntries = viewChild<JournalEntryList>(JournalEntryList);

  protected readonly campaign = this.campaignContext.campaign;
  protected readonly items = signal<readonly NarrativeItem[]>([]);
  protected readonly availableItems = signal<readonly NarrativeItem[]>([]);
  protected readonly itemTypes = signal<readonly ItemConfigurationOption[]>([]);
  protected readonly itemRarities = signal<readonly ItemConfigurationOption[]>([]);
  protected readonly ownerOptions = signal<readonly OwnerOption[]>([]);
  protected readonly mentionCandidates = signal<readonly ResourceMentionCandidate[]>([]);
  protected readonly selectedItem = signal<NarrativeItem | null>(null);
  protected readonly descriptionDraft = signal(emptyNarrativeItemInput().description);
  protected readonly descriptionDirty = signal(false);
  protected readonly imageUrl = signal(DEMO_ITEM_IMAGE_URL);
  protected readonly draftImagePath = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly isSidebarCollapsed = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isImportingImage = signal(false);
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
  protected readonly typeFieldOptions = computed<readonly FormFieldOption[]>(() =>
    this.itemTypes().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly rarityFieldOptions = computed<readonly FormFieldOption[]>(() =>
    this.itemRarities().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly ownerFieldOptions = computed<readonly FormFieldOption[]>(() =>
    this.ownerOptions().map((owner) => ({
      value: `${owner.resourceType}:${owner.resourceId}`,
      label: owner.label,
    })),
  );
  protected readonly statusFieldOptions: readonly FormFieldOption[] = NARRATIVE_ITEM_STATUSES.map(
    (status) => ({ value: status, label: this.statusLabel(status) }),
  );
  protected readonly attunementFieldOptions: readonly FormFieldOption[] = [
    { value: 'none', label: 'Aucune' },
    { value: 'required', label: 'Requise' },
    { value: 'conditional', label: 'Requise sous condition' },
  ];
  protected readonly effectiveImagePath = computed(
    () => this.draftImagePath() ?? this.selectedItem()?.imagePath ?? null,
  );
  protected readonly isSelectedItemDisplayed = computed(() => {
    const item = this.selectedItem();
    return item !== null && isDisplayingResource(this.playerDisplay.state(), 'item', item.id);
  });
  protected readonly filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('fr');
    if (!term) return this.items();
    return this.items().filter((item) =>
      [item.name, item.summary, this.configurationName(item.itemTypeId)]
        .join(' ')
        .toLocaleLowerCase('fr')
        .includes(term),
    );
  });
  protected readonly itemForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    itemTypeId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    itemRarityId: new FormControl<string | null>(null),
    status: new FormControl<NarrativeItemStatus>('active', { nonNullable: true }),
    attunement: new FormControl<AttunementMode>('none', { nonNullable: true }),
    attunementCondition: new FormControl('', { nonNullable: true }),
    ownerKey: new FormControl('', { nonNullable: true }),
    summary: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.route.queryParamMap
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (params) => void this.openRequestedItem(params.get('resourceId'), params.get('entryId')),
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

  protected async requestSelectItem(item: NarrativeItem): Promise<void> {
    if (item.id === this.selectedItem()?.id && !this.isCreating()) return;
    if (await this.confirmPendingChanges()) this.openReadOnly(item);
  }

  protected async requestCreateItem(): Promise<void> {
    if (!(await this.confirmPendingChanges())) return;
    const firstTypeId = this.itemTypes()[0]?.id ?? '';
    this.selectedItem.set(null);
    this.isCreating.set(true);
    this.isEditing.set(true);
    this.draftImagePath.set(null);
    this.imageUrl.set(DEMO_ITEM_IMAGE_URL);
    this.itemForm.reset({
      name: '',
      itemTypeId: firstTypeId,
      itemRarityId: null,
      status: 'active',
      attunement: 'none',
      attunementCondition: '',
      ownerKey: '',
      summary: '',
    });
    this.descriptionDraft.set(emptyNarrativeItemInput().description);
    this.descriptionDirty.set(false);
  }

  protected async openCatalog(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign || !(await this.confirmPendingChanges())) return;
    this.availableItems.set(await this.itemService.listAvailable(campaign.id));
    this.showCatalogDialog.set(true);
  }

  protected async attachItem(item: NarrativeItem): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    await this.itemService.attach(campaign.id, item.id);
    this.showCatalogDialog.set(false);
    await this.reloadItems();
    const attached = this.items().find(({ id }) => id === item.id);
    if (attached) this.openReadOnly(attached);
  }

  protected requestPromotion(): void {
    this.showPromotionDialog.set(true);
  }

  protected async confirmPromotion(): Promise<void> {
    const item = this.selectedItem();
    if (!item) return;
    await this.itemService.promote(item);
    this.showPromotionDialog.set(false);
    await this.reloadItems();
    const refreshed = this.items().find(({ id }) => id === item.id);
    if (refreshed) this.openReadOnly(refreshed);
  }

  protected requestReset(): void {
    this.showResetDialog.set(true);
  }

  protected async confirmReset(): Promise<void> {
    const item = this.selectedItem();
    if (!item) return;
    await this.itemService.resetOverride(item);
    this.showResetDialog.set(false);
    await this.reloadItems();
    const refreshed = this.items().find(({ id }) => id === item.id);
    if (refreshed) this.openReadOnly(refreshed);
  }

  protected editItem(): void {
    const item = this.selectedItem();
    if (!item) return;
    this.isEditing.set(true);
    this.populateForm(item);
  }

  protected updateDescription(value: NarrativeItem['description']): void {
    this.descriptionDraft.set(value);
    this.descriptionDirty.set(true);
  }

  protected openMention(mention: ResourceMentionCandidate): void {
    const campaign = this.campaign();
    if (campaign) void this.mentionNavigation.open(campaign.id, mention);
  }

  protected async chooseImage(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign || this.isImportingImage()) return;
    this.isImportingImage.set(true);
    try {
      const path = await this.imageGateway.chooseAndImport(campaign.universeId);
      if (!path) return;
      const previous = this.draftImagePath();
      this.draftImagePath.set(path);
      this.imageUrl.set(await this.imageGateway.resolveUrl(path));
      this.itemForm.markAsDirty();
      if (previous) await this.discardImage(previous);
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    } finally {
      this.isImportingImage.set(false);
    }
  }

  protected async saveItem(): Promise<boolean> {
    if (
      this.itemForm.invalid ||
      (this.itemForm.controls.attunement.value === 'conditional' &&
        !this.itemForm.controls.attunementCondition.value.trim()) ||
      this.isSaving()
    ) {
      this.itemForm.markAllAsTouched();
      return false;
    }
    const campaign = this.campaign();
    if (!campaign) return false;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const selected = this.selectedItem();
      const oldImagePath = selected?.imagePath ?? null;
      const saved = this.isCreating()
        ? await this.itemService.create(campaign.id, this.formInput(), this.effectiveImagePath())
        : selected
          ? await this.itemService.update(selected, this.formInput(), this.effectiveImagePath())
          : null;
      if (!saved) return false;
      this.draftImagePath.set(null);
      await this.reloadItems();
      this.openReadOnly(saved);
      if (selected?.provenance === 'campaign' && oldImagePath && oldImagePath !== saved.imagePath) {
        await this.discardImage(oldImagePath);
      }
      return true;
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  protected cancelEditing(): void {
    void this.abandonChanges();
  }

  protected requestDeleteItem(): void {
    if (this.selectedItem()) this.showDeleteDialog.set(true);
  }

  protected cancelDelete(): void {
    this.showDeleteDialog.set(false);
  }

  protected async confirmDeleteItem(): Promise<void> {
    const item = this.selectedItem();
    if (!item || this.isSaving()) return;
    this.isSaving.set(true);
    try {
      await this.playerDisplay.withdraw(
        (state) => isDisplayingResource(state, 'item', item.id),
        this.isPlayerDisplayOpen(),
      );
      await this.itemService.delete(item);
      await this.recentResources?.remove('item', item.id);
      if (item.provenance === 'campaign' && item.imagePath) await this.discardImage(item.imagePath);
      await this.reloadItems();
      this.selectedItem.set(null);
      this.imageUrl.set(DEMO_ITEM_IMAGE_URL);
      this.showDeleteDialog.set(false);
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async showOnPlayerDisplay(): Promise<void> {
    const item = this.selectedItem();
    if (!item?.imagePath || !this.isPlayerDisplayOpen() || this.isPublishing()) return;
    this.isPublishing.set(true);
    try {
      const imagePath = item.imagePath;
      await this.playerDisplay.toggle(
        item.campaignId,
        (state) => isDisplayingResource(state, 'item', item.id),
        async () => itemPlayerDisplayState(item, await this.imageGateway.resolveUrl(imagePath)),
      );
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
      this.isPlayerDisplayOpen.set(false);
    } finally {
      this.isPublishing.set(false);
    }
  }

  protected configurationName(id: string | null): string {
    if (!id) return 'Non renseignée';
    return (
      [...this.itemTypes(), ...this.itemRarities()].find((option) => option.id === id)?.name ??
      'Valeur inconnue'
    );
  }

  protected ownerName(owner: ItemOwner | null): string {
    if (!owner) return 'Aucun détenteur';
    return (
      this.ownerOptions().find(
        (option) =>
          option.resourceType === owner.resourceType && option.resourceId === owner.resourceId,
      )?.label ?? 'Détenteur inconnu'
    );
  }

  protected statusLabel(status: NarrativeItemStatus): string {
    return { active: 'En jeu', lost: 'Perdu', destroyed: 'Détruit', retired: 'Retiré' }[status];
  }

  protected attunementLabel(item: NarrativeItem): string {
    if (item.attunement === 'none') return 'Aucune';
    if (item.attunement === 'required') return 'Requise';
    return `Requise — ${item.attunementCondition}`;
  }

  protected continueEditing(): void {
    this.pendingChanges.resolve(false);
  }
  protected async leaveWithoutSaving(): Promise<void> {
    if (this.journalEntries()?.hasPendingChanges()) this.journalEntries()?.discardPendingChanges();
    if (this.isEditing()) await this.abandonChanges();
    this.pendingChanges.resolve(true);
  }
  protected async saveAndLeave(): Promise<void> {
    let saved = true;
    if (this.journalEntries()?.hasPendingChanges()) {
      saved = await this.journalEntries()!.savePendingChanges();
    }
    if (saved && this.isEditing()) saved = await this.saveItem();
    if (saved) this.pendingChanges.resolve(true);
  }

  private async initialize(): Promise<void> {
    try {
      const campaign = await this.campaignContext.load();
      if (!campaign) return;
      await this.configurationService.ensureDefaults(campaign.universeId);
      const [items, types, rarities, npcs, locations, characters, mentionCandidates] =
        await Promise.all([
          this.itemService.list(campaign.id),
          this.configurationService.listForCampaign(campaign.universeId, 'type'),
          this.configurationService.listForCampaign(campaign.universeId, 'rarity'),
          this.npcService.list(campaign.id),
          this.locationService.list(campaign.id),
          this.characterService.list(campaign.id),
          this.mentionNavigation.listCandidates(campaign.id),
        ]);
      this.items.set(items);
      this.itemTypes.set(types);
      this.itemRarities.set(rarities);
      this.ownerOptions.set([
        ...characters.map(({ id, name }) => ({
          resourceType: 'player-character' as const,
          resourceId: id,
          label: `PJ — ${name}`,
        })),
        ...npcs.map(({ id, name }) => ({
          resourceType: 'npc' as const,
          resourceId: id,
          label: `PNJ — ${name}`,
        })),
        ...locations.map(({ id, name }) => ({
          resourceType: 'location' as const,
          resourceId: id,
          label: `Lieu — ${name}`,
        })),
      ]);
      this.mentionCandidates.set(mentionCandidates);
      await this.openRequestedItem(
        this.route.snapshot.queryParamMap?.get('resourceId'),
        this.route.snapshot.queryParamMap?.get('entryId'),
      );
      this.isPlayerDisplayOpen.set(await this.playerDisplay.isOpen());
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async openRequestedItem(
    resourceId: string | null,
    entryId: string | null,
  ): Promise<void> {
    const item = this.items().find(({ id }) => id === resourceId);
    if (!item || item.id === this.selectedItem()?.id) return;
    if (!(await this.confirmPendingChanges())) return;
    this.focusedJournalEntryId.set(entryId);
    this.openReadOnly(item);
  }

  private async reloadItems(): Promise<void> {
    const campaign = this.campaign();
    if (campaign) this.items.set(await this.itemService.list(campaign.id));
  }

  private openReadOnly(item: NarrativeItem): void {
    const refreshed = this.items().find(({ id }) => id === item.id) ?? item;
    this.selectedItem.set(refreshed);
    this.isCreating.set(false);
    this.isEditing.set(false);
    this.draftImagePath.set(null);
    this.populateForm(refreshed);
    void this.loadImage(refreshed.imagePath);
  }

  private populateForm(item: NarrativeItem): void {
    this.itemForm.reset({
      name: item.name,
      itemTypeId: item.itemTypeId,
      itemRarityId: item.itemRarityId,
      status: item.status,
      attunement: item.attunement,
      attunementCondition: item.attunementCondition,
      ownerKey: item.owner ? ownerKey(item.owner) : '',
      summary: item.summary,
    });
    this.itemForm.markAsPristine();
    this.descriptionDraft.set(item.description);
    this.descriptionDirty.set(false);
  }

  private formInput(): UpdateNarrativeItemInput {
    const value = this.itemForm.getRawValue();
    return {
      name: value.name,
      itemTypeId: value.itemTypeId,
      itemRarityId: value.itemRarityId,
      status: value.status,
      attunement: value.attunement,
      attunementCondition: value.attunementCondition,
      owner: parseOwner(value.ownerKey),
      summary: value.summary,
      description: this.descriptionDraft(),
    };
  }

  private async abandonChanges(): Promise<void> {
    const draft = this.draftImagePath();
    this.draftImagePath.set(null);
    if (draft) await this.discardImage(draft);
    const selected = this.selectedItem();
    this.isEditing.set(false);
    this.isCreating.set(false);
    if (selected) {
      this.populateForm(selected);
      await this.loadImage(selected.imagePath);
    } else {
      this.imageUrl.set(DEMO_ITEM_IMAGE_URL);
    }
  }

  private async loadImage(path: string | null): Promise<void> {
    this.imageUrl.set(DEMO_ITEM_IMAGE_URL);
    if (!path) return;
    try {
      this.imageUrl.set(await this.imageGateway.resolveUrl(path));
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    }
  }

  private async discardImage(path: string): Promise<void> {
    try {
      await this.imageGateway.discard(path);
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    }
  }

  private confirmPendingChanges(): boolean | Promise<boolean> {
    const dirtyItem = this.isEditing() && (this.itemForm.dirty || this.descriptionDirty());
    if (!dirtyItem && !this.journalEntries()?.hasPendingChanges()) return true;
    return this.pendingChanges.request();
  }
}

function ownerKey(owner: ItemOwner): string {
  return `${owner.resourceType}:${owner.resourceId}`;
}
function parseOwner(value: string): ItemOwner | null {
  if (!value) return null;
  const separator = value.indexOf(':');
  if (separator <= 0 || separator === value.length - 1) return null;
  return {
    resourceType: value.slice(0, separator) as ItemOwnerType,
    resourceId: value.slice(separator + 1),
  };
}
