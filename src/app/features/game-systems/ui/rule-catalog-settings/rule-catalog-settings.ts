import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { GameRuleOptionService } from '@app/features/game-systems/application/game-rule-option.service';
import type { GameRuleOption } from '@app/features/game-systems/domain/game-rule-option';
import type { GameSystem, GameUniverse } from '@app/features/game-systems/domain/game-system';
import { RuleCatalogSection } from '@app/features/game-systems/ui/rule-catalog-section/rule-catalog-section';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { FormField } from '@app/shared/ui/form-field/form-field';
import { TagPill } from '@app/shared/ui/tag-pill/tag-pill';

@Component({
  selector: 'app-rule-catalog-settings',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonDirective, Dialog, FormField, RuleCatalogSection, TagPill],
  templateUrl: './rule-catalog-settings.html',
  styleUrl: './rule-catalog-settings.scss',
})
export class RuleCatalogSettings {
  private readonly service = inject(GameRuleOptionService);

  readonly system = input.required<GameSystem>();
  readonly universe = input.required<GameUniverse>();

  protected readonly alignments = signal<readonly GameRuleOption[]>([]);
  protected readonly sizes = signal<readonly GameRuleOption[]>([]);
  protected readonly creatureTypes = signal<readonly GameRuleOption[]>([]);
  protected readonly subspecies = signal<readonly GameRuleOption[]>([]);
  protected readonly languages = signal<readonly GameRuleOption[]>([]);
  protected readonly races = signal<readonly GameRuleOption[]>([]);
  protected readonly classes = signal<readonly GameRuleOption[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly pendingRemoval = signal<GameRuleOption | null>(null);
  protected readonly newType = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly newLanguage = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly newRace = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly newClass = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly newSubspecies = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly subspeciesParentId = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly typeOptions = computed(() =>
    this.creatureTypes().map(({ id, label }) => ({ value: id, label })),
  );

  constructor() {
    effect(() => {
      const systemId = this.system().id;
      const universeId = this.universe().id;
      void this.load(systemId, universeId);
    });
  }

  protected async addType(): Promise<void> {
    if (this.newType.invalid) return;
    await this.add('creature_type', this.newType, null);
  }

  protected async addLanguage(): Promise<void> {
    if (this.newLanguage.invalid) return;
    await this.add('language', this.newLanguage, null);
  }

  protected async addRace(): Promise<void> {
    if (this.newRace.invalid) return;
    await this.add('race', this.newRace, null);
  }

  protected async addClass(): Promise<void> {
    if (this.newClass.invalid) return;
    await this.add('class', this.newClass, null);
  }

  protected async addSubspecies(): Promise<void> {
    if (this.newSubspecies.invalid || this.subspeciesParentId.invalid) return;
    await this.add('creature_subspecies', this.newSubspecies, this.subspeciesParentId.value);
  }

  protected origin(option: GameRuleOption): string {
    return option.universeId ? this.universe().name : this.system().name;
  }

  protected parentLabel(option: GameRuleOption): string {
    return (
      this.creatureTypes().find(({ id }) => id === option.parentOptionId)?.label ?? 'Type inconnu'
    );
  }

  protected requestRemoval(option: GameRuleOption): void {
    this.pendingRemoval.set(option);
    this.error.set(null);
  }

  protected async confirmRemoval(): Promise<void> {
    const option = this.pendingRemoval();
    if (!option || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      await this.service.removeFromUniverse(option);
      this.pendingRemoval.set(null);
      await this.load(this.system().id, this.universe().id, false);
    } catch (error) {
      this.pendingRemoval.set(null);
      this.error.set(
        error instanceof Error ? error.message : 'Impossible de supprimer cette valeur.',
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  private async add(
    category: 'creature_type' | 'creature_subspecies' | 'language' | 'race' | 'class',
    control: FormControl<string>,
    parentOptionId: string | null,
  ): Promise<void> {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      await this.service.addForUniverse(
        this.system().id,
        this.universe().id,
        category,
        control.value,
        parentOptionId,
      );
      control.reset('');
      if (category === 'creature_subspecies') this.subspeciesParentId.reset('');
      await this.load(this.system().id, this.universe().id, false);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Impossible d’ajouter cette valeur.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private async load(gameSystemId: string, universeId: string, showLoading = true): Promise<void> {
    if (showLoading) this.isLoading.set(true);
    this.error.set(null);
    try {
      const [alignments, sizes, creatureTypes, subspecies, languages, races, classes] =
        await Promise.all([
          this.service.listForSystem(gameSystemId, 'alignment'),
          this.service.listForSystem(gameSystemId, 'size'),
          this.service.listForUniverse(gameSystemId, universeId, 'creature_type'),
          this.service.listForUniverse(gameSystemId, universeId, 'creature_subspecies'),
          this.service.listForUniverse(gameSystemId, universeId, 'language'),
          this.service.listForUniverse(gameSystemId, universeId, 'race'),
          this.service.listForUniverse(gameSystemId, universeId, 'class'),
        ]);
      this.alignments.set(alignments);
      this.sizes.set(sizes);
      this.creatureTypes.set(creatureTypes);
      this.subspecies.set(subspecies);
      this.languages.set(languages);
      this.races.set(races);
      this.classes.set(classes);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Impossible de charger les référentiels.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
