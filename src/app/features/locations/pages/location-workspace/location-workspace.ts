import { Component, computed, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { LocationWorkspaceFacade } from '@app/features/locations/application/location-workspace.facade';
import {
  DEMO_LOCATION_IMAGE_URL,
  type Location,
  type UpdateLocationInput,
} from '@app/features/locations/domain/location';
import {
  buildLocationEntries,
  descendantIds,
  hideCollapsedDescendants,
} from '@app/features/locations/domain/location-tree';
import { LocationService } from '@app/features/locations/application/location.service';
import { LocationTreeStateService } from '@app/features/locations/application/location-tree-state.service';
import type { PendingChangesAware } from '@app/core/navigation/pending-changes.guard';
import { JournalEntryList } from '@app/features/journal/ui/journal-entry-list/journal-entry-list';
import { RecentResourceTrackerDirective } from '@app/features/recent-resources/ui/recent-resource-tracker.directive';
import { RecentResourceStore } from '@app/features/recent-resources/application/recent-resource.store';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { EmptyState } from '@app/shared/ui/empty-state/empty-state';
import { EntityTitle } from '@app/shared/ui/entity-title/entity-title';
import { FormField, type FormFieldOption } from '@app/shared/ui/form-field/form-field';
import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';
import {
  createEmptyRichTextDocument,
  type RichTextDocument,
} from '@app/shared/rich-text-editor/rich-text-document';
import type { ResourceMentionCandidate } from '@app/shared/rich-text-editor/resource-mention';
import { ResourceMentionNavigationService } from '@app/shared/rich-text-editor/resource-mention-navigation.service';
import { errorMessage } from '@app/shared/error-message';
import { PendingChangesPrompt } from '@app/core/navigation/pending-changes-prompt';
import { PendingChangesDialog } from '@app/shared/ui/pending-changes-dialog/pending-changes-dialog';
import { MediaViewer } from '@app/shared/ui/media-viewer/media-viewer';

@Component({
  selector: 'app-location-workspace',
  imports: [
    MediaViewer,
    PendingChangesDialog,
    ReactiveFormsModule,
    JournalEntryList,
    ButtonDirective,
    Dialog,
    EmptyState,
    EntityTitle,
    FormField,
    RecentResourceTrackerDirective,
    RichTextEditor,
  ],
  templateUrl: './location-workspace.html',
  styleUrl: './location-workspace.scss',
})
export class LocationWorkspace implements OnInit, PendingChangesAware {
  private readonly campaignContext = inject(CampaignContext);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locationService = inject(LocationService);
  private readonly locationTreeState = inject(LocationTreeStateService);
  private readonly workspace = inject(LocationWorkspaceFacade);
  private readonly mentionNavigation = inject(ResourceMentionNavigationService);
  private readonly recentResources = inject(RecentResourceStore, { optional: true });
  private readonly journalEntries = viewChild<JournalEntryList>(JournalEntryList);

  protected readonly campaign = this.campaignContext.campaign;
  protected readonly locations = signal<readonly Location[]>([]);
  protected readonly availableLocations = signal<readonly Location[]>([]);
  protected readonly promotionPlan = signal<readonly Location[]>([]);
  protected readonly parentFieldOptions = computed<readonly FormFieldOption[]>(() =>
    this.parentOptions().map((entry) => ({ value: entry.location.id, label: entry.path })),
  );
  protected readonly selectedLocation = signal<Location | null>(null);
  protected readonly galleryImagePaths = signal<readonly string[]>([]);
  protected readonly galleryImageUrls = signal<readonly string[]>([]);
  protected readonly importedDraftImagePaths = signal<readonly string[]>([]);
  protected readonly selectedImageIndex = signal(0);
  protected readonly searchTerm = signal('');
  protected readonly collapsedLocationIds = signal<ReadonlySet<string>>(new Set());
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
  protected readonly showImageDeleteDialog = signal(false);
  protected readonly showImageViewer = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly focusedJournalEntryId = signal<string | null>(null);
  protected readonly mentionCandidates = signal<readonly ResourceMentionCandidate[]>([]);
  protected readonly descriptionDraft = signal<RichTextDocument>(createEmptyRichTextDocument());
  protected readonly currentImagePath = computed(
    () => this.galleryImagePaths()[this.selectedImageIndex()] ?? null,
  );
  protected readonly imageUrl = computed(
    () => this.galleryImageUrls()[this.selectedImageIndex()] ?? DEMO_LOCATION_IMAGE_URL,
  );
  protected readonly isUsingDemoImage = computed(() => this.currentImagePath() === null);
  protected readonly hasPreviousImage = computed(() => this.selectedImageIndex() > 0);
  protected readonly hasNextImage = computed(
    () => this.selectedImageIndex() < this.galleryImagePaths().length - 1,
  );
  protected readonly isSelectedLocationDisplayed = computed(() => {
    const location = this.selectedLocation();
    return (
      location !== null && this.workspace.isDisplayed(location, this.workspace.playerDisplayState())
    );
  });
  protected readonly locationEntries = computed(() => {
    const entries = buildLocationEntries(this.locations());
    const searchTerm = this.searchTerm().trim().toLocaleLowerCase('fr');
    if (!searchTerm) {
      return hideCollapsedDescendants(entries, this.collapsedLocationIds());
    }

    return entries
      .filter(({ location, path }) =>
        [location.name, location.summary, path].some((value) =>
          value.toLocaleLowerCase('fr').includes(searchTerm),
        ),
      )
      .map((entry) => ({ ...entry, depth: 0 }));
  });
  protected readonly parentOptions = computed(() => {
    const selectedId = this.selectedLocation()?.id;
    const excludedIds = selectedId
      ? descendantIds(this.locations(), selectedId)
      : new Set<string>();
    if (selectedId) {
      excludedIds.add(selectedId);
    }

    return buildLocationEntries(this.locations()).filter(
      ({ location }) => !excludedIds.has(location.id),
    );
  });
  protected readonly locationForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    parentLocationId: new FormControl<string | null>(null),
    summary: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    hideNameOnPlayerDisplay: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.route.queryParamMap
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (params) =>
          void this.openRequestedLocation(params.get('resourceId'), params.get('entryId')),
      );
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

  protected isLocationCollapsed(locationId: string): boolean {
    return this.collapsedLocationIds().has(locationId);
  }

  protected toggleLocationCollapsed(locationId: string): void {
    const collapsedLocationIds = new Set(this.collapsedLocationIds());
    if (collapsedLocationIds.has(locationId)) {
      collapsedLocationIds.delete(locationId);
    } else {
      collapsedLocationIds.add(locationId);
    }
    this.collapsedLocationIds.set(collapsedLocationIds);

    const campaign = this.campaign();
    if (campaign) {
      void this.locationTreeState
        .save(campaign.id, collapsedLocationIds)
        .catch((error: unknown) => this.error.set(errorMessage(error)));
    }
  }

  protected async requestSelectLocation(location: Location): Promise<void> {
    if (this.selectedLocation()?.id === location.id && !this.isCreating()) {
      return;
    }

    if (await this.confirmPendingChanges()) {
      this.openReadOnly(location);
    }
  }

  protected async requestCreateLocation(): Promise<void> {
    if (!(await this.confirmPendingChanges())) {
      return;
    }

    this.selectedLocation.set(null);
    this.resetGallery();
    this.isCreating.set(true);
    this.isEditing.set(true);
    this.descriptionDraft.set(createEmptyRichTextDocument());
    this.locationForm.reset({
      name: '',
      parentLocationId: null,
      summary: '',
      notes: '',
      hideNameOnPlayerDisplay: false,
    });
    this.locationForm.markAsPristine();
  }

  protected async openCatalog(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign || !(await this.confirmPendingChanges())) return;
    this.availableLocations.set(await this.locationService.listAvailable(campaign.id));
    this.showCatalogDialog.set(true);
  }

  protected async attachLocation(location: Location): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    await this.locationService.attach(campaign.id, location.id);
    this.showCatalogDialog.set(false);
    await this.reloadLocations();
    const attached = this.locations().find(({ id }) => id === location.id);
    if (attached) this.openReadOnly(attached);
  }

  protected async requestPromotion(): Promise<void> {
    const location = this.selectedLocation();
    if (!location) return;
    this.promotionPlan.set(await this.locationService.promotionPlan(location));
    this.showPromotionDialog.set(true);
  }

  protected async confirmPromotion(): Promise<void> {
    const location = this.selectedLocation();
    if (!location) return;
    await this.locationService.promote(location);
    this.showPromotionDialog.set(false);
    this.promotionPlan.set([]);
    await this.reloadLocations();
    const refreshed = this.locations().find(({ id }) => id === location.id);
    if (refreshed) this.openReadOnly(refreshed);
  }

  protected requestReset(): void {
    this.showResetDialog.set(true);
  }

  protected async confirmReset(): Promise<void> {
    const location = this.selectedLocation();
    if (!location) return;
    await this.locationService.resetOverride(location);
    this.showResetDialog.set(false);
    await this.reloadLocations();
    const refreshed = this.locations().find(({ id }) => id === location.id);
    if (refreshed) this.openReadOnly(refreshed);
  }

  protected editLocation(): void {
    const location = this.selectedLocation();
    if (!location) {
      return;
    }

    this.isCreating.set(false);
    this.isEditing.set(true);
    this.populateForm(location);
  }

  protected cancelEditing(): void {
    void this.abandonChanges();
  }

  protected updateDescription(description: RichTextDocument): void {
    this.descriptionDraft.set(description);
    this.locationForm.markAsDirty();
  }

  protected openMention(mention: ResourceMentionCandidate): void {
    const campaign = this.campaign();
    if (campaign) void this.mentionNavigation.open(campaign.id, mention);
  }

  protected selectPreviousImage(): void {
    if (this.hasPreviousImage()) {
      this.selectedImageIndex.update((index) => index - 1);
    }
  }

  protected selectNextImage(): void {
    if (this.hasNextImage()) {
      this.selectedImageIndex.update((index) => index + 1);
    }
  }

  protected openImageViewer(): void {
    if (!this.isUsingDemoImage()) {
      this.showImageViewer.set(true);
    }
  }

  protected closeImageViewer(): void {
    this.showImageViewer.set(false);
  }

  protected async chooseImages(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign || this.isImportingImage()) {
      return;
    }

    this.isImportingImage.set(true);
    this.error.set(null);

    try {
      const { paths: importedPaths, urls: importedUrls } = await this.workspace.importImages(
        campaign.universeId,
      );
      if (importedPaths.length === 0) {
        return;
      }
      const firstImportedIndex = this.galleryImagePaths().length;
      this.galleryImagePaths.update((paths) => [...paths, ...importedPaths]);
      this.galleryImageUrls.update((urls) => [...urls, ...importedUrls]);
      this.importedDraftImagePaths.update((paths) => [...paths, ...importedPaths]);
      this.selectedImageIndex.set(firstImportedIndex);
      this.locationForm.markAsDirty();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isImportingImage.set(false);
    }
  }

  protected requestDeleteCurrentImage(): void {
    if (this.currentImagePath()) this.showImageDeleteDialog.set(true);
  }

  protected async confirmDeleteCurrentImage(): Promise<void> {
    const index = this.selectedImageIndex();
    const path = this.currentImagePath();
    const url = this.imageUrl();
    if (!path) return;

    try {
      await this.workspace.withdrawImage(
        this.selectedLocation()?.id,
        url,
        this.isPlayerDisplayOpen(),
      );
    } catch (error) {
      this.error.set(errorMessage(error));
      return;
    }

    this.galleryImagePaths.update((paths) => paths.filter((_, candidate) => candidate !== index));
    this.galleryImageUrls.update((urls) => urls.filter((_, candidate) => candidate !== index));
    this.selectedImageIndex.set(Math.max(0, Math.min(index, this.galleryImagePaths().length - 1)));
    this.showImageDeleteDialog.set(false);
    this.closeImageViewer();
    this.locationForm.markAsDirty();

    if (this.importedDraftImagePaths().includes(path)) {
      this.importedDraftImagePaths.update((paths) =>
        paths.filter((candidate) => candidate !== path),
      );
      this.reportErrors(await this.workspace.discardImages([path]));
    }
  }

  protected async saveLocation(): Promise<boolean> {
    if (this.locationForm.invalid || this.isSaving()) {
      this.locationForm.markAllAsTouched();
      return false;
    }

    const campaign = this.campaign();
    if (!campaign) {
      return false;
    }

    this.isSaving.set(true);
    this.error.set(null);

    try {
      const existing = this.isCreating() ? null : this.selectedLocation();
      if (!this.isCreating() && !existing) {
        return false;
      }

      const { location: savedLocation, cleanupErrors } = await this.workspace.save({
        campaignId: campaign.id,
        existing,
        input: this.locationInput(),
        imagePaths: this.galleryImagePaths(),
        selectedImagePath: this.currentImagePath(),
        isPlayerDisplayOpen: this.isPlayerDisplayOpen(),
      });

      this.importedDraftImagePaths.set([]);
      await this.reloadLocations();
      this.openReadOnly(savedLocation);
      this.reportErrors(cleanupErrors);
      return true;
    } catch (error) {
      this.error.set(errorMessage(error));
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  protected requestDeleteLocation(): void {
    if (this.selectedLocation()) {
      this.showDeleteDialog.set(true);
    }
  }

  protected async showLocationOnPlayerDisplay(): Promise<void> {
    const location = this.selectedLocation();
    if (!location || !this.isPlayerDisplayOpen() || this.isPublishing()) {
      return;
    }

    this.isPublishing.set(true);
    this.error.set(null);

    try {
      await this.workspace.toggleOnPlayerDisplay(location, this.imageUrl());
    } catch (error) {
      this.error.set(errorMessage(error));
      this.isPlayerDisplayOpen.set(false);
    } finally {
      this.isPublishing.set(false);
    }
  }

  protected playerDisplayActionTitle(): string {
    return this.isPlayerDisplayOpen()
      ? this.isSelectedLocationDisplayed()
        ? "Retirer ce lieu de l'écran joueurs"
        : "Afficher ce lieu sur l'écran joueurs"
      : "Ouvre d'abord l'écran joueurs depuis la régie.";
  }

  protected cancelDelete(): void {
    this.showDeleteDialog.set(false);
  }

  protected async confirmDeleteLocation(): Promise<void> {
    const location = this.selectedLocation();
    if (!location || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);

    try {
      const cleanupErrors = await this.workspace.delete(location, this.isPlayerDisplayOpen());
      await this.recentResources?.remove('location', location.id);
      this.reportErrors(cleanupErrors);
      await this.reloadLocations();
      this.selectedLocation.set(null);
      this.resetGallery();
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
    if (this.isEditing() && this.locationForm.dirty) await this.abandonChanges();
    this.pendingChanges.resolve(true);
  }

  protected async saveAndLeave(): Promise<void> {
    const saved = this.journalEntries()?.hasPendingChanges()
      ? await this.journalEntries()!.savePendingChanges()
      : await this.saveLocation();
    if (saved) {
      this.pendingChanges.resolve(true);
    }
  }

  protected locationName(locationId: string | null): string {
    return locationId
      ? (this.locations().find((location) => location.id === locationId)?.name ?? 'Lieu inconnu')
      : 'Racine de la campagne';
  }

  private async initialize(): Promise<void> {
    try {
      const campaign = await this.campaignContext.load();
      if (!campaign) return;
      const [, mentionCandidates, collapsedLocationIds] = await Promise.all([
        this.reloadLocations(),
        this.mentionNavigation.listCandidates(campaign.id),
        this.locationTreeState.load(campaign.id),
      ]);
      this.mentionCandidates.set(mentionCandidates);
      this.collapsedLocationIds.set(collapsedLocationIds);
      await this.openRequestedLocation(
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

  private async openRequestedLocation(
    resourceId: string | null,
    entryId: string | null,
  ): Promise<void> {
    const requested = this.locations().find(({ id }) => id === resourceId);
    if (!requested || requested.id === this.selectedLocation()?.id) return;
    if (!(await this.confirmPendingChanges())) return;
    this.focusedJournalEntryId.set(entryId);
    this.openReadOnly(requested);
  }

  private async reloadLocations(): Promise<void> {
    const campaign = this.campaign();
    if (campaign) {
      this.locations.set(await this.locationService.list(campaign.id));
    }
  }

  private openReadOnly(location: Location): void {
    const refreshedLocation =
      this.locations().find((candidate) => candidate.id === location.id) ?? location;
    this.selectedLocation.set(refreshedLocation);
    this.isCreating.set(false);
    this.isEditing.set(false);
    this.importedDraftImagePaths.set([]);
    this.populateForm(refreshedLocation);
    void this.loadGalleryPreview(refreshedLocation.imagePaths);
  }

  private populateForm(location: Location): void {
    this.locationForm.reset({
      name: location.name,
      parentLocationId: location.parentLocationId,
      summary: location.summary,
      notes: '',
      hideNameOnPlayerDisplay: location.hideNameOnPlayerDisplay,
    });
    this.descriptionDraft.set(location.description);
    this.locationForm.markAsPristine();
  }

  private locationInput(): UpdateLocationInput {
    return { ...this.locationForm.getRawValue(), description: this.descriptionDraft() };
  }

  private async abandonChanges(): Promise<void> {
    const importedPaths = this.importedDraftImagePaths();
    this.importedDraftImagePaths.set([]);
    this.reportErrors(await this.workspace.discardImages(importedPaths));

    const selectedLocation = this.selectedLocation();
    this.isEditing.set(false);
    this.isCreating.set(false);
    if (selectedLocation) {
      this.populateForm(selectedLocation);
      await this.loadGalleryPreview(selectedLocation.imagePaths);
    } else {
      this.locationForm.reset({
        name: '',
        parentLocationId: null,
        summary: '',
        notes: '',
        hideNameOnPlayerDisplay: false,
      });
      this.descriptionDraft.set(createEmptyRichTextDocument());
      this.resetGallery();
    }
  }

  private async loadGalleryPreview(relativePaths: readonly string[]): Promise<void> {
    this.galleryImagePaths.set(relativePaths);
    this.galleryImageUrls.set([]);
    this.selectedImageIndex.set(0);
    try {
      const urls = await this.workspace.imageUrls(relativePaths);
      if (this.galleryImagePaths() === relativePaths) this.galleryImageUrls.set(urls);
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private resetGallery(): void {
    this.galleryImagePaths.set([]);
    this.galleryImageUrls.set([]);
    this.importedDraftImagePaths.set([]);
    this.selectedImageIndex.set(0);
    this.closeImageViewer();
    this.showImageDeleteDialog.set(false);
  }

  private reportErrors(errors: readonly unknown[]): void {
    const lastError = errors.at(-1);
    if (lastError !== undefined) this.error.set(errorMessage(lastError));
  }

  private confirmPendingChanges(): boolean | Promise<boolean> {
    if (
      !(this.isEditing() && this.locationForm.dirty) &&
      !this.journalEntries()?.hasPendingChanges()
    ) {
      return true;
    }

    return this.pendingChanges.request();
  }
}
