import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { MonsterService } from '@app/features/bestiary/application/monster.service';
import { MonsterImageGateway } from '@app/features/bestiary/data-access/monster-image.gateway';
import {
  createEmptyMonsterSheet,
  type Monster,
  type MonsterSheet,
} from '@app/features/bestiary/domain/monster';
import type { RichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import { RichTextEditor } from '@app/shared/rich-text-editor/rich-text-editor';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { EmptyState } from '@app/shared/ui/empty-state/empty-state';
import { FormField } from '@app/shared/ui/form-field/form-field';
import { TagInput } from '@app/shared/ui/tag-input/tag-input';
import type { PendingChangesAware } from '@app/core/navigation/pending-changes.guard';

type TagField =
  | 'savingThrows'
  | 'skills'
  | 'damageVulnerabilities'
  | 'damageResistances'
  | 'damageImmunities'
  | 'conditionImmunities'
  | 'senses'
  | 'languages';

type PendingDecisionResolver = (canLeave: boolean) => void;

@Component({
  selector: 'app-bestiary-workspace',
  imports: [
    ReactiveFormsModule,
    ButtonDirective,
    Dialog,
    EmptyState,
    FormField,
    RichTextEditor,
    TagInput,
  ],
  templateUrl: './bestiary-workspace.html',
  styleUrl: './bestiary-workspace.scss',
})
export class BestiaryWorkspace implements OnInit, PendingChangesAware {
  private readonly context = inject(CampaignContext);
  private readonly service = inject(MonsterService);
  private readonly imageGateway = inject(MonsterImageGateway);
  private pendingDecisionResolver?: PendingDecisionResolver;

  protected readonly campaign = this.context.campaign;
  protected readonly monsters = signal<readonly Monster[]>([]);
  protected readonly availableMonsters = signal<readonly Monster[]>([]);
  protected readonly selectedMonster = signal<Monster | null>(null);
  protected readonly monsterPendingDetachment = signal<Monster | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly isCatalogOpen = signal(false);
  protected readonly showPendingChangesDialog = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly draftImagePath = signal<string | null>(null);
  protected readonly imageUrl = signal<string | null>(null);
  protected readonly officialDescription = signal<RichTextDocument>(
    createEmptyMonsterSheet().officialDescription,
  );
  protected readonly filteredMonsters = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('fr');
    if (!term) return this.monsters();
    return this.monsters().filter((monster) =>
      [monster.name, monster.sheet.creatureType, monster.sheet.challengeRating].some((value) =>
        value.toLocaleLowerCase('fr').includes(term),
      ),
    );
  });
  protected readonly monsterForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    size: new FormControl('', { nonNullable: true }),
    creatureType: new FormControl('', { nonNullable: true }),
    alignment: new FormControl('', { nonNullable: true }),
    armorClass: new FormControl<number | null>(null, [Validators.min(0)]),
    armorClassDetails: new FormControl('', { nonNullable: true }),
    hitPoints: new FormControl<number | null>(null, [Validators.min(0)]),
    hitPointFormula: new FormControl('', { nonNullable: true }),
    speed: new FormControl('', { nonNullable: true }),
    strength: new FormControl<number | null>(null, [Validators.min(0)]),
    dexterity: new FormControl<number | null>(null, [Validators.min(0)]),
    constitution: new FormControl<number | null>(null, [Validators.min(0)]),
    intelligence: new FormControl<number | null>(null, [Validators.min(0)]),
    wisdom: new FormControl<number | null>(null, [Validators.min(0)]),
    charisma: new FormControl<number | null>(null, [Validators.min(0)]),
    savingThrows: new FormControl<readonly string[]>([], { nonNullable: true }),
    skills: new FormControl<readonly string[]>([], { nonNullable: true }),
    damageVulnerabilities: new FormControl<readonly string[]>([], { nonNullable: true }),
    damageResistances: new FormControl<readonly string[]>([], { nonNullable: true }),
    damageImmunities: new FormControl<readonly string[]>([], { nonNullable: true }),
    conditionImmunities: new FormControl<readonly string[]>([], { nonNullable: true }),
    senses: new FormControl<readonly string[]>([], { nonNullable: true }),
    languages: new FormControl<readonly string[]>([], { nonNullable: true }),
    challengeRating: new FormControl('', { nonNullable: true }),
    experiencePoints: new FormControl<number | null>(null, [Validators.min(0)]),
  });

  ngOnInit(): void {
    void this.load();
  }

  canDeactivate(): boolean | Promise<boolean> {
    return this.confirmPendingChanges();
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected async selectMonster(monster: Monster): Promise<void> {
    if (!(await this.confirmPendingChanges())) return;
    await this.discardDraftImageSafely();
    this.isEditing.set(false);
    this.isCreating.set(false);
    this.isCatalogOpen.set(false);
    this.selectedMonster.set(monster);
    await this.resolveImage(monster.imagePath);
  }

  protected async createMonster(): Promise<void> {
    if (!(await this.confirmPendingChanges())) return;
    await this.discardDraftImageSafely();
    this.selectedMonster.set(null);
    this.isCatalogOpen.set(false);
    this.isCreating.set(true);
    this.isEditing.set(true);
    this.draftImagePath.set(null);
    this.imageUrl.set(null);
    this.populateForm(null);
  }

  protected editMonster(): void {
    const monster = this.selectedMonster();
    if (!monster) return;
    this.isCreating.set(false);
    this.isEditing.set(true);
    this.populateForm(monster);
  }

  protected async cancelEditing(): Promise<void> {
    await this.discardDraftImageSafely();
    this.isEditing.set(false);
    this.isCreating.set(false);
    const monster = this.selectedMonster();
    if (monster) this.populateForm(monster);
  }

  protected async saveMonster(): Promise<boolean> {
    const campaign = this.campaign();
    if (!campaign || this.monsterForm.invalid || this.isSaving()) {
      this.monsterForm.markAllAsTouched();
      return false;
    }
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const previousImagePath = this.selectedMonster()?.imagePath ?? null;
      const importedImagePath = this.draftImagePath();
      const input = {
        name: this.monsterForm.controls.name.value,
        imagePath: importedImagePath ?? previousImagePath,
        sheet: this.buildSheet(),
      };
      const saved = this.isCreating()
        ? await this.service.create(campaign.id, input)
        : await this.service.update(this.selectedMonster()!, input);
      this.selectedMonster.set(saved);
      this.isCreating.set(false);
      this.isEditing.set(false);
      this.draftImagePath.set(null);
      if (importedImagePath && previousImagePath && previousImagePath !== importedImagePath) {
        await this.discardImageSafely(previousImagePath);
      }
      await this.load(saved.id);
      return true;
    } catch (error) {
      this.error.set(this.errorMessage(error));
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async chooseImage(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    try {
      const path = await this.imageGateway.chooseAndImport(campaign.universeId);
      if (!path) return;
      const previous = this.draftImagePath();
      this.draftImagePath.set(path);
      this.imageUrl.set(await this.imageGateway.resolveUrl(path));
      this.monsterForm.markAsDirty();
      if (previous) await this.imageGateway.discard(previous);
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  protected async openCatalog(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    if (!(await this.confirmPendingChanges())) return;
    await this.discardDraftImageSafely();
    this.availableMonsters.set(await this.service.listAvailable(campaign.id));
    this.isCatalogOpen.set(true);
    this.isEditing.set(false);
    this.isCreating.set(false);
  }

  protected closeCatalog(): void {
    this.isCatalogOpen.set(false);
  }

  protected updateOfficialDescription(value: RichTextDocument): void {
    this.officialDescription.set(value);
    this.monsterForm.markAsDirty();
  }

  protected async attachMonster(monster: Monster): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    await this.service.attach(campaign.id, monster.id);
    await this.load(monster.id);
    this.isCatalogOpen.set(false);
  }

  protected requestDetach(monster: Monster): void {
    this.monsterPendingDetachment.set(monster);
  }

  protected async confirmDetach(): Promise<void> {
    const monster = this.monsterPendingDetachment();
    if (!monster) return;
    await this.service.detach(monster);
    this.monsterPendingDetachment.set(null);
    this.selectedMonster.set(null);
    await this.load();
  }

  protected cancelDetach(): void {
    this.monsterPendingDetachment.set(null);
  }

  protected continueEditing(): void {
    this.resolvePendingDecision(false);
  }

  protected async leaveWithoutSaving(): Promise<void> {
    await this.discardDraftImageSafely();
    this.isEditing.set(false);
    this.isCreating.set(false);
    this.resolvePendingDecision(true);
  }

  protected async saveAndLeave(): Promise<void> {
    if (await this.saveMonster()) this.resolvePendingDecision(true);
  }

  protected updateTags(field: TagField, values: readonly string[]): void {
    this.monsterForm.controls[field].setValue(values);
    this.monsterForm.controls[field].markAsDirty();
  }

  protected abilityModifier(score: number | null): string {
    if (score === null) return '—';
    const modifier = Math.floor((score - 10) / 2);
    return `${modifier >= 0 ? '+' : ''}${modifier}`;
  }

  protected typeLine(sheet: MonsterSheet): string {
    return (
      [sheet.size, sheet.creatureType, sheet.alignment].filter(Boolean).join(', ') ||
      'Type non renseigné'
    );
  }

  private async load(selectedId?: string): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    try {
      const monsters = await this.service.list(campaign.id);
      this.monsters.set(monsters);
      const selected = monsters.find(({ id }) => id === selectedId) ?? this.selectedMonster();
      if (selected && monsters.some(({ id }) => id === selected.id)) {
        this.selectedMonster.set(selected);
        await this.resolveImage(selected.imagePath);
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private populateForm(monster: Monster | null): void {
    const sheet = monster?.sheet ?? createEmptyMonsterSheet();
    this.monsterForm.reset({
      name: monster?.name ?? '',
      size: sheet.size,
      creatureType: sheet.creatureType,
      alignment: sheet.alignment,
      armorClass: sheet.armorClass,
      armorClassDetails: sheet.armorClassDetails,
      hitPoints: sheet.hitPoints,
      hitPointFormula: sheet.hitPointFormula,
      speed: sheet.speed,
      strength: sheet.abilities.strength,
      dexterity: sheet.abilities.dexterity,
      constitution: sheet.abilities.constitution,
      intelligence: sheet.abilities.intelligence,
      wisdom: sheet.abilities.wisdom,
      charisma: sheet.abilities.charisma,
      savingThrows: sheet.savingThrows,
      skills: sheet.skills,
      damageVulnerabilities: sheet.damageVulnerabilities,
      damageResistances: sheet.damageResistances,
      damageImmunities: sheet.damageImmunities,
      conditionImmunities: sheet.conditionImmunities,
      senses: sheet.senses,
      languages: sheet.languages,
      challengeRating: sheet.challengeRating,
      experiencePoints: sheet.experiencePoints,
    });
    this.officialDescription.set(sheet.officialDescription);
    this.monsterForm.markAsPristine();
  }

  private buildSheet(): MonsterSheet {
    const value = this.monsterForm.getRawValue();
    const previous = this.selectedMonster()?.sheet ?? createEmptyMonsterSheet();
    return {
      ...previous,
      size: value.size,
      creatureType: value.creatureType,
      alignment: value.alignment,
      armorClass: value.armorClass,
      armorClassDetails: value.armorClassDetails,
      hitPoints: value.hitPoints,
      hitPointFormula: value.hitPointFormula,
      speed: value.speed,
      abilities: {
        strength: value.strength,
        dexterity: value.dexterity,
        constitution: value.constitution,
        intelligence: value.intelligence,
        wisdom: value.wisdom,
        charisma: value.charisma,
      },
      savingThrows: value.savingThrows,
      skills: value.skills,
      damageVulnerabilities: value.damageVulnerabilities,
      damageResistances: value.damageResistances,
      damageImmunities: value.damageImmunities,
      conditionImmunities: value.conditionImmunities,
      senses: value.senses,
      languages: value.languages,
      challengeRating: value.challengeRating,
      experiencePoints: value.experiencePoints,
      officialDescription: this.officialDescription(),
    };
  }

  private async resolveImage(path: string | null): Promise<void> {
    this.imageUrl.set(path ? await this.imageGateway.resolveUrl(path) : null);
  }

  private async discardDraftImageSafely(): Promise<void> {
    const path = this.draftImagePath();
    this.draftImagePath.set(null);
    if (!path) return;
    await this.discardImageSafely(path);
  }

  private async discardImageSafely(path: string): Promise<void> {
    try {
      await this.imageGateway.discard(path);
    } catch {
      // Le nettoyage ne doit pas empêcher le MJ d'abandonner un brouillon.
    }
  }

  private hasPendingChanges(): boolean {
    return this.isEditing() && (this.monsterForm.dirty || this.draftImagePath() !== null);
  }

  private confirmPendingChanges(): boolean | Promise<boolean> {
    if (!this.hasPendingChanges()) return true;
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

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Impossible de gérer le bestiaire.';
  }
}
