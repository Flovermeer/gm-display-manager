import { Component, computed, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
  type AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidationErrors,
  type ValidatorFn,
  Validators,
} from '@angular/forms';

import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { CombatStore } from '@app/features/combat/application/combat.store';
import { playerCharacterCombatantSource } from '@app/features/combat/domain/combatant-source';
import type { PendingChangesAware } from '@app/core/navigation/pending-changes.guard';
import { CharacterRuleCatalogService } from '@app/features/game-systems/application/character-rule-catalog.service';
import {
  EMPTY_CHARACTER_RULE_CATALOG,
  subracesForRace,
  type CharacterRuleCatalog,
} from '@app/features/game-systems/domain/character-rule-catalog';
import { optionIdFor, optionLabel } from '@app/features/game-systems/domain/creature-rule-catalog';
import { PlayerCharacterWorkspaceFacade } from '@app/features/players/application/player-character-workspace.facade';
import {
  classAndLevel,
  EMPTY_PLAYER_CHARACTER_SHEET,
  hasFullHitPoints,
  hitPointLabel,
  PLAYER_CHARACTER_STATUSES,
  playerCharacterStatusLabel,
  type PlayerCharacter,
  type PlayerCharacterStatus,
  type UpdatePlayerCharacterInput,
} from '@app/features/players/domain/player-character';
import { PlayerCharacterService } from '@app/features/players/application/player-character.service';
import { JournalEntryList } from '@app/features/journal/ui/journal-entry-list/journal-entry-list';
import { RecentResourceTrackerDirective } from '@app/features/recent-resources/ui/recent-resource-tracker.directive';
import { RecentResourceStore } from '@app/features/recent-resources/application/recent-resource.store';
import { TagInput } from '@app/shared/ui/tag-input/tag-input';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { EmptyState } from '@app/shared/ui/empty-state/empty-state';
import { EntityTitle } from '@app/shared/ui/entity-title/entity-title';
import { FormField, type FormFieldOption } from '@app/shared/ui/form-field/form-field';
import { errorMessage } from '@app/shared/error-message';
import { PendingChangesPrompt } from '@app/core/navigation/pending-changes-prompt';
import { PendingChangesDialog } from '@app/shared/ui/pending-changes-dialog/pending-changes-dialog';

@Component({
  selector: 'app-player-character-workspace',
  imports: [
    PendingChangesDialog,
    ReactiveFormsModule,
    TagInput,
    JournalEntryList,
    ButtonDirective,
    Dialog,
    EmptyState,
    EntityTitle,
    FormField,
    RecentResourceTrackerDirective,
  ],
  templateUrl: './player-character-workspace.html',
  styleUrl: './player-character-workspace.scss',
})
export class PlayerCharacterWorkspace implements OnInit, PendingChangesAware {
  private readonly campaignContext = inject(CampaignContext);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly characterService = inject(PlayerCharacterService);
  private readonly characterRules = inject(CharacterRuleCatalogService);
  private readonly workspace = inject(PlayerCharacterWorkspaceFacade);
  private readonly combat = inject(CombatStore, { optional: true });
  private readonly recentResources = inject(RecentResourceStore, { optional: true });
  private readonly journalEntries = viewChild<JournalEntryList>(JournalEntryList);

  protected readonly campaign = this.campaignContext.campaign;
  protected readonly characters = signal<readonly PlayerCharacter[]>([]);
  protected readonly availableCharacters = signal<readonly PlayerCharacter[]>([]);
  protected readonly selectedCharacter = signal<PlayerCharacter | null>(null);
  protected readonly portraitUrl = signal<string | null>(null);
  protected readonly draftPortraitPath = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly isSidebarCollapsed = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isImportingPortrait = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly pendingChanges = new PendingChangesPrompt();
  protected readonly showDeleteDialog = signal(false);
  protected readonly showResetHitPointsDialog = signal(false);
  protected readonly showCatalogDialog = signal(false);
  protected readonly showPromotionDialog = signal(false);
  protected readonly showResetDialog = signal(false);
  protected readonly showValidationErrors = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly focusedJournalEntryId = signal<string | null>(null);
  protected readonly ruleCatalog = signal<CharacterRuleCatalog>(EMPTY_CHARACTER_RULE_CATALOG);
  protected readonly raceOptions = computed(() =>
    this.formOptions(this.ruleCatalog().races, this.selectedCharacter()?.sheet.race),
  );
  protected subraceOptions(): readonly FormFieldOption[] {
    const raceId = this.characterForm.controls.race.value;
    return this.formOptions(
      subracesForRace(this.ruleCatalog(), raceId),
      this.selectedCharacter()?.sheet.subrace,
    );
  }
  protected readonly classOptions = computed(() =>
    this.formOptions(this.ruleCatalog().classes, this.selectedCharacter()?.sheet.className),
  );
  protected readonly statuses = PLAYER_CHARACTER_STATUSES;
  protected readonly statusFieldOptions: readonly FormFieldOption[] = PLAYER_CHARACTER_STATUSES.map(
    (status) => ({ value: status, label: playerCharacterStatusLabel(status) }),
  );
  protected readonly effectivePortraitPath = computed(
    () => this.draftPortraitPath() ?? this.selectedCharacter()?.portraitPath ?? null,
  );
  protected readonly filteredCharacters = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('fr');
    if (!term) return this.characters();
    return this.characters().filter((character) =>
      [
        character.name,
        character.playerName,
        character.sheet.className,
        character.sheet.race,
        character.sheet.subrace,
      ].some((value) => value.toLocaleLowerCase('fr').includes(term)),
    );
  });

  protected readonly characterForm = new FormGroup(
    {
      name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      playerName: new FormControl('', { nonNullable: true }),
      status: new FormControl<PlayerCharacterStatus>('active', { nonNullable: true }),
      currentHitPoints: new FormControl<number | null>(null, [Validators.min(0), integerValidator]),
      maxHitPoints: new FormControl<number | null>(null, [Validators.min(0), integerValidator]),
      race: new FormControl('', { nonNullable: true }),
      subrace: new FormControl('', { nonNullable: true }),
      className: new FormControl('', { nonNullable: true }),
      level: new FormControl<number | null>(null, [
        Validators.min(1),
        Validators.max(20),
        integerValidator,
      ]),
      armorClass: new FormControl<number | null>(null, [Validators.min(0), integerValidator]),
      speed: new FormControl<number | null>(null, [Validators.min(0), integerValidator]),
      passivePerception: new FormControl<number | null>(null, [
        Validators.min(0),
        integerValidator,
      ]),
      passiveInsight: new FormControl<number | null>(null, [Validators.min(0), integerValidator]),
      passiveInvestigation: new FormControl<number | null>(null, [
        Validators.min(0),
        integerValidator,
      ]),
      senses: new FormControl<readonly string[]>([], { nonNullable: true }),
      languages: new FormControl<readonly string[]>([], { nonNullable: true }),
      conditions: new FormControl<readonly string[]>([], { nonNullable: true }),
      exhaustionLevel: new FormControl(0, {
        nonNullable: true,
        validators: [Validators.min(0), Validators.max(6), integerValidator],
      }),
      privateNotes: new FormControl('', { nonNullable: true }),
    },
    { validators: hitPointRangeValidator },
  );
  protected readonly hitPointsControl = new FormControl<number | null>(null, [Validators.min(0)]);

  protected addToCombat(character: PlayerCharacter): void {
    void this.combat?.requestAdd(playerCharacterCombatantSource(character));
  }

  ngOnInit(): void {
    this.route.queryParamMap
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (params) =>
          void this.openRequestedCharacter(params.get('resourceId'), params.get('entryId')),
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

  protected raceChanged(): void {
    const current = this.characterForm.controls.subrace.value;
    const raceId = this.characterForm.controls.race.value;
    if (current && !subracesForRace(this.ruleCatalog(), raceId).some(({ id }) => id === current)) {
      this.characterForm.controls.subrace.setValue('');
    }
  }

  protected async requestSelectCharacter(character: PlayerCharacter): Promise<void> {
    if (this.selectedCharacter()?.id === character.id && !this.isCreating()) return;
    if (await this.confirmPendingChanges()) this.openReadOnly(character);
  }

  protected async requestCreateCharacter(): Promise<void> {
    if (!(await this.confirmPendingChanges())) return;
    this.selectedCharacter.set(null);
    this.portraitUrl.set(null);
    this.draftPortraitPath.set(null);
    this.isCreating.set(true);
    this.isEditing.set(true);
    this.populateEmptyForm();
  }

  protected async openCatalog(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign || !(await this.confirmPendingChanges())) return;
    this.availableCharacters.set(await this.characterService.listAvailable(campaign.id));
    this.showCatalogDialog.set(true);
  }

  protected async attachCharacter(character: PlayerCharacter): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    await this.characterService.attach(campaign.id, character.id);
    this.showCatalogDialog.set(false);
    await this.reloadCharacters();
    const attached = this.characters().find(({ id }) => id === character.id);
    if (attached) this.openReadOnly(attached);
  }

  protected requestPromotion(): void {
    this.showPromotionDialog.set(true);
  }

  protected async confirmPromotion(): Promise<void> {
    const character = this.selectedCharacter();
    if (!character) return;
    await this.characterService.promote(character);
    this.showPromotionDialog.set(false);
    await this.reloadCharacters();
    const refreshed = this.characters().find(({ id }) => id === character.id);
    if (refreshed) this.openReadOnly(refreshed);
  }

  protected requestReset(): void {
    this.showResetDialog.set(true);
  }

  protected async confirmReset(): Promise<void> {
    const character = this.selectedCharacter();
    if (!character) return;
    await this.characterService.resetOverride(character);
    this.showResetDialog.set(false);
    await this.reloadCharacters();
    const refreshed = this.characters().find(({ id }) => id === character.id);
    if (refreshed) this.openReadOnly(refreshed);
  }

  protected editCharacter(): void {
    const character = this.selectedCharacter();
    if (!character) return;
    this.isCreating.set(false);
    this.isEditing.set(true);
    this.populateForm(character);
  }

  protected cancelEditing(): void {
    void this.abandonChanges();
  }

  protected async choosePortrait(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign || this.isImportingPortrait()) return;
    this.isImportingPortrait.set(true);
    this.error.set(null);
    try {
      const imported = await this.workspace.importPortrait(campaign.universeId);
      if (!imported) return;
      const previousDraft = this.draftPortraitPath();
      this.draftPortraitPath.set(imported.path);
      this.portraitUrl.set(imported.url);
      this.characterForm.markAsDirty();
      this.reportErrors(await this.workspace.discardPortraits([previousDraft]));
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isImportingPortrait.set(false);
    }
  }

  protected async saveCharacter(): Promise<boolean> {
    if (this.characterForm.invalid || this.isSaving()) {
      this.characterForm.markAllAsTouched();
      this.showValidationErrors.set(true);
      return false;
    }
    const campaign = this.campaign();
    if (!campaign) return false;

    this.isSaving.set(true);
    this.error.set(null);
    try {
      const existing = this.isCreating() ? null : this.selectedCharacter();
      if (!this.isCreating() && !existing) return false;
      const { character: saved, cleanupErrors } = await this.workspace.save({
        campaignId: campaign.id,
        existing,
        input: this.formInput(),
        portraitPath: this.effectivePortraitPath(),
      });
      this.draftPortraitPath.set(null);
      this.showValidationErrors.set(false);
      await this.reloadCharacters();
      this.openReadOnly(saved);
      this.reportErrors(cleanupErrors);
      return true;
    } catch (error) {
      this.error.set(errorMessage(error));
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async saveCurrentHitPoints(): Promise<void> {
    const character = this.selectedCharacter();
    const currentHitPoints = this.hitPointsControl.value;
    if (
      !character ||
      currentHitPoints === null ||
      this.hitPointsControl.invalid ||
      this.isSaving()
    ) {
      this.hitPointsControl.markAsTouched();
      return;
    }
    await this.persistHitPoints(character, currentHitPoints);
  }

  protected requestResetHitPoints(): void {
    if (this.selectedCharacter()?.maxHitPoints !== null) this.showResetHitPointsDialog.set(true);
  }

  protected cancelResetHitPoints(): void {
    this.showResetHitPointsDialog.set(false);
  }

  protected async confirmResetHitPoints(): Promise<void> {
    const character = this.selectedCharacter();
    if (!character || character.maxHitPoints === null) return;
    await this.persistHitPoints(character, character.maxHitPoints);
    this.showResetHitPointsDialog.set(false);
  }

  protected requestDeleteCharacter(): void {
    if (this.selectedCharacter()) this.showDeleteDialog.set(true);
  }

  protected cancelDelete(): void {
    this.showDeleteDialog.set(false);
  }

  protected async confirmDeleteCharacter(): Promise<void> {
    const character = this.selectedCharacter();
    if (!character || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const cleanupErrors = await this.workspace.delete(character);
      await this.recentResources?.remove('player-character', character.id);
      this.reportErrors(cleanupErrors);
      await this.reloadCharacters();
      this.selectedCharacter.set(null);
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
    if (this.isEditing() && this.characterForm.dirty) await this.abandonChanges();
    this.pendingChanges.resolve(true);
  }

  protected async saveAndLeave(): Promise<void> {
    const saved = this.journalEntries()?.hasPendingChanges()
      ? await this.journalEntries()!.savePendingChanges()
      : await this.saveCharacter();
    if (saved) this.pendingChanges.resolve(true);
  }

  protected readonly statusLabel = playerCharacterStatusLabel;
  protected readonly hitPointLabel = hitPointLabel;
  protected readonly hasFullHitPoints = hasFullHitPoints;
  protected readonly classAndLevel = classAndLevel;

  protected valueOrDash(value: string | number | null): string | number {
    return value === '' || value === null ? '—' : value;
  }

  protected invalidFieldLabels(): readonly string[] {
    const labels: Readonly<Record<keyof typeof this.characterForm.controls, string>> = {
      name: 'Personnage',
      playerName: 'Joueur ou joueuse',
      status: 'Statut',
      currentHitPoints: 'PV actuels',
      maxHitPoints: 'PV maximum',
      race: 'Espèce',
      subrace: 'Sous-espèce',
      className: 'Classe',
      level: 'Niveau (1 à 20)',
      armorClass: "Classe d'armure",
      speed: 'Vitesse',
      passivePerception: 'Perception passive',
      passiveInsight: 'Intuition passive',
      passiveInvestigation: 'Investigation passive',
      senses: 'Sens particuliers',
      languages: 'Langues',
      conditions: 'Conditions',
      exhaustionLevel: 'Épuisement (0 à 6)',
      privateNotes: 'Notes privées',
    };

    const invalidFields = Object.entries(this.characterForm.controls)
      .filter(([, control]) => control.invalid)
      .map(([name]) => labels[name as keyof typeof labels]);
    if (this.characterForm.hasError('hitPointRange')) invalidFields.push('PV actuels');
    return [...new Set(invalidFields)];
  }

  protected updateTags(
    field: 'senses' | 'languages' | 'conditions',
    tags: readonly string[],
  ): void {
    this.characterForm.controls[field].setValue(tags);
    this.characterForm.controls[field].markAsDirty();
  }

  private async initialize(): Promise<void> {
    try {
      if (!(await this.campaignContext.load())) return;
      await this.loadRuleCatalog();
      await this.reloadCharacters();
      await this.openRequestedCharacter(
        this.route.snapshot.queryParamMap?.get('resourceId'),
        this.route.snapshot.queryParamMap?.get('entryId'),
      );
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async openRequestedCharacter(
    resourceId: string | null,
    entryId: string | null,
  ): Promise<void> {
    const requested = this.characters().find(({ id }) => id === resourceId);
    if (!requested || requested.id === this.selectedCharacter()?.id) return;
    if (!(await this.confirmPendingChanges())) return;
    this.focusedJournalEntryId.set(entryId);
    this.openReadOnly(requested);
  }

  private async reloadCharacters(): Promise<void> {
    const campaign = this.campaign();
    if (campaign) this.characters.set(await this.characterService.list(campaign.id));
  }

  private openReadOnly(character: PlayerCharacter): void {
    const refreshed =
      this.characters().find((candidate) => candidate.id === character.id) ?? character;
    this.selectedCharacter.set(refreshed);
    this.isCreating.set(false);
    this.isEditing.set(false);
    this.showValidationErrors.set(false);
    this.populateForm(refreshed);
    this.hitPointsControl.reset(refreshed.currentHitPoints);
    void this.loadPortrait(refreshed.portraitPath);
  }

  private populateForm(character: PlayerCharacter): void {
    this.characterForm.reset({
      name: character.name,
      playerName: character.playerName,
      status: character.status,
      currentHitPoints: character.currentHitPoints,
      maxHitPoints: character.maxHitPoints,
      ...character.sheet,
      race:
        optionIdFor(character.sheet.raceOptionId, character.sheet.race, this.ruleCatalog().races) ||
        character.sheet.race,
      subrace:
        optionIdFor(
          character.sheet.subraceOptionId,
          character.sheet.subrace,
          this.ruleCatalog().subraces,
        ) || character.sheet.subrace,
      className:
        optionIdFor(
          character.sheet.classOptionId,
          character.sheet.className,
          this.ruleCatalog().classes,
        ) || character.sheet.className,
      privateNotes: '',
    });
    this.characterForm.markAsPristine();
  }

  private populateEmptyForm(): void {
    this.characterForm.reset({
      name: '',
      playerName: '',
      status: 'active',
      currentHitPoints: null,
      maxHitPoints: null,
      ...EMPTY_PLAYER_CHARACTER_SHEET,
      privateNotes: '',
    });
    this.characterForm.markAsPristine();
    this.showValidationErrors.set(false);
  }

  private formInput(): UpdatePlayerCharacterInput {
    const value = this.characterForm.getRawValue();
    return {
      name: value.name,
      playerName: value.playerName,
      status: value.status,
      currentHitPoints: value.currentHitPoints,
      maxHitPoints: value.maxHitPoints,
      sheet: {
        raceOptionId: this.optionId(value.race, this.ruleCatalog().races),
        race: optionLabel(value.race, this.ruleCatalog().races, value.race),
        subraceOptionId: this.optionId(value.subrace, this.ruleCatalog().subraces),
        subrace: optionLabel(value.subrace, this.ruleCatalog().subraces, value.subrace),
        classOptionId: this.optionId(value.className, this.ruleCatalog().classes),
        className: optionLabel(value.className, this.ruleCatalog().classes, value.className),
        level: value.level,
        armorClass: value.armorClass,
        speed: value.speed,
        passivePerception: value.passivePerception,
        passiveInsight: value.passiveInsight,
        passiveInvestigation: value.passiveInvestigation,
        senses: value.senses,
        languages: value.languages,
        conditions: value.conditions,
        exhaustionLevel: value.exhaustionLevel,
        privateNotes: '',
      },
    };
  }

  private async persistHitPoints(
    character: PlayerCharacter,
    currentHitPoints: number,
  ): Promise<void> {
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const updated = await this.characterService.updateHitPoints(character, currentHitPoints);
      await this.reloadCharacters();
      this.openReadOnly(updated);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  private async loadRuleCatalog(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    this.ruleCatalog.set(await this.characterRules.loadForUniverse(campaign.universeId));
  }

  private formOptions(
    options: readonly { id: string; label: string; code: string }[],
    legacyLabel = '',
  ): readonly FormFieldOption[] {
    const normalized = legacyLabel.trim().toLocaleLowerCase('fr');
    const mapped = options.some(
      ({ label, code }) =>
        label.toLocaleLowerCase('fr') === normalized || code.toLocaleLowerCase('fr') === normalized,
    );
    return [
      ...options.map(({ id, label }) => ({ value: id, label })),
      ...(legacyLabel && !mapped
        ? [{ value: legacyLabel, label: `${legacyLabel} (ancienne valeur)` }]
        : []),
    ];
  }

  private optionId(value: string, options: readonly { id: string }[]): string | null {
    return options.some(({ id }) => id === value) ? value : null;
  }

  private async abandonChanges(): Promise<void> {
    const draftPortraitPath = this.draftPortraitPath();
    this.draftPortraitPath.set(null);
    this.reportErrors(await this.workspace.discardPortraits([draftPortraitPath]));
    const selected = this.selectedCharacter();
    this.isEditing.set(false);
    this.isCreating.set(false);
    this.showValidationErrors.set(false);
    if (selected) {
      this.populateForm(selected);
      await this.loadPortrait(selected.portraitPath);
    } else {
      this.populateEmptyForm();
      this.portraitUrl.set(null);
    }
  }

  private reportErrors(errors: readonly unknown[]): void {
    const lastError = errors.at(-1);
    if (lastError !== undefined) this.error.set(errorMessage(lastError));
  }

  private confirmPendingChanges(): boolean | Promise<boolean> {
    if (
      !(this.isEditing() && this.characterForm.dirty) &&
      !this.journalEntries()?.hasPendingChanges()
    )
      return true;
    return this.pendingChanges.request();
  }

  private async loadPortrait(relativePath: string | null): Promise<void> {
    this.portraitUrl.set(null);
    if (!relativePath) return;
    try {
      const url = await this.workspace.portraitUrl(relativePath);
      if (this.effectivePortraitPath() === relativePath) this.portraitUrl.set(url);
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}

const hitPointRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const current = control.get('currentHitPoints')?.value as number | null;
  const maximum = control.get('maxHitPoints')?.value as number | null;
  return current !== null && maximum !== null && current > maximum ? { hitPointRange: true } : null;
};

const integerValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value as number | null;
  return value === null || Number.isInteger(value) ? null : { integer: true };
};
