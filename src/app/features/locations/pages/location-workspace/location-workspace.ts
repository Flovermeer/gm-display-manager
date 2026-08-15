import { Component, computed, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import { PlayerDisplayStore } from '@app/features/display/application/player-display.store';
import type { Location } from '@app/features/locations/domain/location';
import { LocationService } from '@app/features/locations/application/location.service';
import { LocationImageGateway } from '@app/features/locations/data-access/location-image.gateway';
import type { PendingChangesAware } from '@app/core/navigation/pending-changes.guard';
import { JournalEntryList } from '@app/features/journal/ui/journal-entry-list/journal-entry-list';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { EmptyState } from '@app/shared/ui/empty-state/empty-state';
import { EntityTitle } from '@app/shared/ui/entity-title/entity-title';
import { FormField, type FormFieldOption } from '@app/shared/ui/form-field/form-field';

type PendingDecisionResolver = (canLeave: boolean) => void;
type LocationListEntry = Readonly<{ location: Location; depth: number; path: string }>;

const DEMO_LOCATION_IMAGE_URL = '/demo/tavern.svg';

@Component({
  selector: 'app-location-workspace',
  imports: [
    ReactiveFormsModule,
    JournalEntryList,
    ButtonDirective,
    Dialog,
    EmptyState,
    EntityTitle,
    FormField,
  ],
  templateUrl: './location-workspace.html',
  styleUrl: './location-workspace.scss',
})
export class LocationWorkspace implements OnInit, PendingChangesAware {
  private readonly campaignContext = inject(CampaignContext);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locationService = inject(LocationService);
  private readonly locationImageGateway = inject(LocationImageGateway);
  private readonly displayGateway = inject(DisplayGateway);
  private readonly playerDisplayStore = inject(PlayerDisplayStore);
  private pendingDecisionResolver?: PendingDecisionResolver;
  private readonly journalEntries = viewChild<JournalEntryList>(JournalEntryList);

  protected readonly campaign = this.campaignContext.campaign;
  protected readonly locations = signal<readonly Location[]>([]);
  protected readonly availableLocations = signal<readonly Location[]>([]);
  protected readonly promotionPlan = signal<readonly Location[]>([]);
  protected readonly parentFieldOptions = computed<readonly FormFieldOption[]>(() =>
    this.parentOptions().map((entry) => ({ value: entry.location.id, label: entry.path })),
  );
  protected readonly selectedLocation = signal<Location | null>(null);
  protected readonly imageUrl = signal<string>(DEMO_LOCATION_IMAGE_URL);
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
  protected readonly showPendingChangesDialog = signal(false);
  protected readonly showDeleteDialog = signal(false);
  protected readonly showCatalogDialog = signal(false);
  protected readonly showPromotionDialog = signal(false);
  protected readonly showResetDialog = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly focusedJournalEntryId = signal<string | null>(null);
  protected readonly effectiveImagePath = computed(
    () => this.draftImagePath() ?? this.selectedLocation()?.imagePath ?? null,
  );
  protected readonly isUsingDemoImage = computed(() => this.effectiveImagePath() === null);
  protected readonly locationEntries = computed(() => {
    const entries = buildLocationEntries(this.locations());
    const searchTerm = this.searchTerm().trim().toLocaleLowerCase('fr');
    if (!searchTerm) {
      return entries;
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
    this.imageUrl.set(DEMO_LOCATION_IMAGE_URL);
    this.draftImagePath.set(null);
    this.isCreating.set(true);
    this.isEditing.set(true);
    this.locationForm.reset({ name: '', parentLocationId: null, summary: '', notes: '' });
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

  protected async chooseImage(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign || this.isImportingImage()) {
      return;
    }

    this.isImportingImage.set(true);
    this.error.set(null);

    try {
      const importedPath = await this.locationImageGateway.chooseAndImport(campaign.universeId);
      if (!importedPath) {
        return;
      }

      const previousDraft = this.draftImagePath();
      this.draftImagePath.set(importedPath);
      this.imageUrl.set(await this.locationImageGateway.resolveUrl(importedPath));
      this.locationForm.markAsDirty();

      if (previousDraft) {
        await this.locationImageGateway.discard(previousDraft);
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.isImportingImage.set(false);
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
      const selectedLocation = this.selectedLocation();
      const previousImagePath = selectedLocation?.imagePath ?? null;
      const imagePath = this.effectiveImagePath();
      const savedLocation = this.isCreating()
        ? await this.locationService.create(campaign.id, this.locationForm.getRawValue(), imagePath)
        : selectedLocation
          ? await this.locationService.update(
              selectedLocation,
              this.locationForm.getRawValue(),
              imagePath,
            )
          : null;

      if (!savedLocation) {
        return false;
      }

      this.draftImagePath.set(null);
      await this.reloadLocations();
      this.openReadOnly(savedLocation);
      await this.refreshPublishedLocation(savedLocation);
      if (
        selectedLocation?.provenance === 'campaign' &&
        previousImagePath &&
        previousImagePath !== savedLocation.imagePath
      ) {
        await this.discardImageSafely(previousImagePath);
      }
      return true;
    } catch (error) {
      this.error.set(this.errorMessage(error));
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
      const state = {
        mode: 'location' as const,
        locationId: location.id,
        name: location.name,
        imagePath: location.imagePath
          ? await this.locationImageGateway.resolveUrl(location.imagePath)
          : DEMO_LOCATION_IMAGE_URL,
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
    return this.isPlayerDisplayOpen()
      ? "Afficher ce lieu sur l'écran joueurs"
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
      const displayState = this.playerDisplayStore.state();
      if (displayState.mode === 'location' && displayState.locationId === location.id) {
        this.playerDisplayStore.showBlank();
        if (this.isPlayerDisplayOpen()) {
          await this.displayGateway.sendPlayerDisplayState({ mode: 'blank' });
        }
      }

      await this.locationService.delete(location);
      if (location.provenance === 'campaign' && location.imagePath) {
        await this.discardImageSafely(location.imagePath);
      }
      await this.reloadLocations();
      this.selectedLocation.set(null);
      this.imageUrl.set(DEMO_LOCATION_IMAGE_URL);
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
    if (this.journalEntries()?.hasPendingChanges()) this.journalEntries()?.discardPendingChanges();
    if (this.isEditing() && this.locationForm.dirty) await this.abandonChanges();
    this.resolvePendingDecision(true);
  }

  protected async saveAndLeave(): Promise<void> {
    const saved = this.journalEntries()?.hasPendingChanges()
      ? await this.journalEntries()!.savePendingChanges()
      : await this.saveLocation();
    if (saved) {
      this.resolvePendingDecision(true);
    }
  }

  protected locationName(locationId: string | null): string {
    return locationId
      ? (this.locations().find((location) => location.id === locationId)?.name ?? 'Lieu inconnu')
      : 'Racine de la campagne';
  }

  private async initialize(): Promise<void> {
    try {
      if (!(await this.campaignContext.load())) return;
      await this.reloadLocations();
      await this.openRequestedLocation(
        this.route.snapshot.queryParamMap?.get('resourceId'),
        this.route.snapshot.queryParamMap?.get('entryId'),
      );
      if (this.displayGateway.isDesktop) {
        this.isPlayerDisplayOpen.set(await this.displayGateway.isPlayerDisplayOpen());
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
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
    this.draftImagePath.set(null);
    this.populateForm(refreshedLocation);
    void this.loadImagePreview(refreshedLocation.imagePath);
  }

  private populateForm(location: Location): void {
    this.locationForm.reset({
      name: location.name,
      parentLocationId: location.parentLocationId,
      summary: location.summary,
      notes: '',
    });
    this.locationForm.markAsPristine();
  }

  private async abandonChanges(): Promise<void> {
    const draftImagePath = this.draftImagePath();
    this.draftImagePath.set(null);
    if (draftImagePath) {
      await this.discardImageSafely(draftImagePath);
    }

    const selectedLocation = this.selectedLocation();
    this.isEditing.set(false);
    this.isCreating.set(false);
    if (selectedLocation) {
      this.populateForm(selectedLocation);
      await this.loadImagePreview(selectedLocation.imagePath);
    } else {
      this.locationForm.reset({ name: '', parentLocationId: null, summary: '', notes: '' });
      this.imageUrl.set(DEMO_LOCATION_IMAGE_URL);
    }
  }

  private async loadImagePreview(relativePath: string | null): Promise<void> {
    this.imageUrl.set(DEMO_LOCATION_IMAGE_URL);
    if (!relativePath) {
      return;
    }

    try {
      const url = await this.locationImageGateway.resolveUrl(relativePath);
      if (this.effectiveImagePath() === relativePath) {
        this.imageUrl.set(url);
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  private async refreshPublishedLocation(location: Location): Promise<void> {
    const currentState = this.playerDisplayStore.state();
    if (currentState.mode !== 'location' || currentState.locationId !== location.id) {
      return;
    }

    const state = {
      ...currentState,
      name: location.name,
      imagePath: location.imagePath
        ? await this.locationImageGateway.resolveUrl(location.imagePath)
        : DEMO_LOCATION_IMAGE_URL,
    };
    this.playerDisplayStore.setState(state);
    if (this.isPlayerDisplayOpen()) {
      await this.displayGateway.sendPlayerDisplayState(state);
    }
  }

  private async discardImageSafely(relativePath: string): Promise<void> {
    try {
      await this.locationImageGateway.discard(relativePath);
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  private confirmPendingChanges(): boolean | Promise<boolean> {
    if (
      !(this.isEditing() && this.locationForm.dirty) &&
      !this.journalEntries()?.hasPendingChanges()
    ) {
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

function buildLocationEntries(locations: readonly Location[]): readonly LocationListEntry[] {
  const byParent = new Map<string | null, Location[]>();
  for (const location of locations) {
    const siblings = byParent.get(location.parentLocationId) ?? [];
    siblings.push(location);
    byParent.set(location.parentLocationId, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort(
      (left, right) => left.name.localeCompare(right.name, 'fr') || left.id.localeCompare(right.id),
    );
  }

  const entries: LocationListEntry[] = [];
  const visited = new Set<string>();
  const append = (parentId: string | null, depth: number, parentPath: string) => {
    for (const location of byParent.get(parentId) ?? []) {
      if (visited.has(location.id)) {
        continue;
      }
      visited.add(location.id);
      const path = parentPath ? `${parentPath} › ${location.name}` : location.name;
      entries.push({ location, depth, path });
      append(location.id, depth + 1, path);
    }
  };

  append(null, 0, '');
  for (const location of locations) {
    if (!visited.has(location.id)) {
      entries.push({ location, depth: 0, path: location.name });
    }
  }
  return entries;
}

function descendantIds(locations: readonly Location[], parentId: string): Set<string> {
  const descendants = new Set<string>();
  const pending = [parentId];
  while (pending.length > 0) {
    const currentId = pending.pop();
    for (const location of locations) {
      if (location.parentLocationId === currentId && !descendants.has(location.id)) {
        descendants.add(location.id);
        pending.push(location.id);
      }
    }
  }
  return descendants;
}
