import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import type { Campaign } from '../campaign/campaign';
import { CampaignService } from '../campaign/campaign.service';
import { CampaignNavigation } from '../campaign-navigation/campaign-navigation';
import type { PendingChangesAware } from '../navigation/pending-changes.guard';
import {
  EMPTY_PLAYER_CHARACTER_SHEET,
  PLAYER_CHARACTER_STATUSES,
  type PlayerCharacter,
  type PlayerCharacterStatus,
  type UpdatePlayerCharacterInput,
} from '../player-character/player-character';
import { PlayerCharacterService } from '../player-character/player-character.service';
import { TagInput } from '../shared/tag-input/tag-input';

type PendingDecisionResolver = (canLeave: boolean) => void;

@Component({
  selector: 'app-player-character-workspace',
  imports: [CampaignNavigation, ReactiveFormsModule, TagInput],
  templateUrl: './player-character-workspace.html',
  styleUrl: './player-character-workspace.scss',
})
export class PlayerCharacterWorkspace implements OnInit, PendingChangesAware {
  private readonly campaignService = inject(CampaignService);
  private readonly characterService = inject(PlayerCharacterService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private pendingDecisionResolver?: PendingDecisionResolver;

  protected readonly campaign = signal<Campaign | null>(null);
  protected readonly characters = signal<readonly PlayerCharacter[]>([]);
  protected readonly selectedCharacter = signal<PlayerCharacter | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly isSidebarCollapsed = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly showPendingChangesDialog = signal(false);
  protected readonly showDeleteDialog = signal(false);
  protected readonly showResetHitPointsDialog = signal(false);
  protected readonly showValidationErrors = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statuses = PLAYER_CHARACTER_STATUSES;
  protected readonly filteredCharacters = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('fr');
    if (!term) return this.characters();
    return this.characters().filter((character) =>
      [
        character.name,
        character.playerName,
        character.sheet.className,
        character.sheet.species,
      ].some((value) => value.toLocaleLowerCase('fr').includes(term)),
    );
  });

  protected readonly characterForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    playerName: new FormControl('', { nonNullable: true }),
    status: new FormControl<PlayerCharacterStatus>('active', { nonNullable: true }),
    currentHitPoints: new FormControl<number | null>(null, [Validators.min(0)]),
    maxHitPoints: new FormControl<number | null>(null, [Validators.min(0)]),
    species: new FormControl('', { nonNullable: true }),
    className: new FormControl('', { nonNullable: true }),
    level: new FormControl<number | null>(null, [Validators.min(1), Validators.max(20)]),
    armorClass: new FormControl<number | null>(null, [Validators.min(0)]),
    speed: new FormControl<number | null>(null, [Validators.min(0)]),
    passivePerception: new FormControl<number | null>(null, [Validators.min(0)]),
    passiveInsight: new FormControl<number | null>(null, [Validators.min(0)]),
    passiveInvestigation: new FormControl<number | null>(null, [Validators.min(0)]),
    senses: new FormControl<readonly string[]>([], { nonNullable: true }),
    languages: new FormControl<readonly string[]>([], { nonNullable: true }),
    conditions: new FormControl<readonly string[]>([], { nonNullable: true }),
    exhaustionLevel: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(6)],
    }),
    privateNotes: new FormControl('', { nonNullable: true }),
  });
  protected readonly hitPointsControl = new FormControl<number | null>(null, [Validators.min(0)]);

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

  protected async requestSelectCharacter(character: PlayerCharacter): Promise<void> {
    if (this.selectedCharacter()?.id === character.id && !this.isCreating()) return;
    if (await this.confirmPendingChanges()) this.openReadOnly(character);
  }

  protected async requestCreateCharacter(): Promise<void> {
    if (!(await this.confirmPendingChanges())) return;
    this.selectedCharacter.set(null);
    this.isCreating.set(true);
    this.isEditing.set(true);
    this.populateEmptyForm();
  }

  protected editCharacter(): void {
    const character = this.selectedCharacter();
    if (!character) return;
    this.isCreating.set(false);
    this.isEditing.set(true);
    this.populateForm(character);
  }

  protected cancelEditing(): void {
    this.abandonChanges();
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
      const selected = this.selectedCharacter();
      const saved = this.isCreating()
        ? await this.characterService.create(campaign.id, this.formInput())
        : selected
          ? await this.characterService.update(selected, this.formInput())
          : null;
      if (!saved) return false;
      this.showValidationErrors.set(false);
      await this.reloadCharacters();
      this.openReadOnly(saved);
      return true;
    } catch (error) {
      this.error.set(this.errorMessage(error));
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
      await this.characterService.delete(character);
      await this.reloadCharacters();
      this.selectedCharacter.set(null);
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
    if (await this.saveCharacter()) this.resolvePendingDecision(true);
  }

  protected statusLabel(status: PlayerCharacterStatus): string {
    const labels: Record<PlayerCharacterStatus, string> = {
      active: 'Actif',
      dead: 'Mort',
      retired: 'Retiré',
      missing: 'Disparu',
    };
    return labels[status];
  }

  protected hitPointLabel(character: PlayerCharacter): string {
    if (character.currentHitPoints === null && character.maxHitPoints === null)
      return 'PV non renseignés';
    return `${character.currentHitPoints ?? '—'} / ${character.maxHitPoints ?? '—'} PV`;
  }

  protected classAndLevel(character: PlayerCharacter): string {
    const className = character.sheet.className || 'Classe non renseignée';
    return character.sheet.level === null
      ? className
      : `${className} · niveau ${character.sheet.level}`;
  }

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
      species: 'Espèce',
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

    return Object.entries(this.characterForm.controls)
      .filter(([, control]) => control.invalid)
      .map(([name]) => labels[name as keyof typeof labels]);
  }

  protected updateTags(
    field: 'senses' | 'languages' | 'conditions',
    tags: readonly string[],
  ): void {
    this.characterForm.controls[field].setValue(tags);
    this.characterForm.controls[field].markAsDirty();
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
      await this.reloadCharacters();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
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
  }

  private populateForm(character: PlayerCharacter): void {
    this.characterForm.reset({
      name: character.name,
      playerName: character.playerName,
      status: character.status,
      currentHitPoints: character.currentHitPoints,
      maxHitPoints: character.maxHitPoints,
      ...character.sheet,
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
        species: value.species,
        className: value.className,
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
        privateNotes: value.privateNotes,
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
      this.error.set(this.errorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  private abandonChanges(): void {
    const selected = this.selectedCharacter();
    this.isEditing.set(false);
    this.isCreating.set(false);
    this.showValidationErrors.set(false);
    if (selected) this.populateForm(selected);
    else this.populateEmptyForm();
  }

  private confirmPendingChanges(): boolean | Promise<boolean> {
    if (!this.isEditing() || !this.characterForm.dirty) return true;
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

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Une erreur inattendue est survenue.';
  }
}
