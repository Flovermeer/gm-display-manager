import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { GameRuleOptionService } from '@app/features/game-systems/application/game-rule-option.service';
import type { GameRuleOption } from '@app/features/game-systems/domain/game-rule-option';
import type { GameSystem, GameUniverse } from '@app/features/game-systems/domain/game-system';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { FormField } from '@app/shared/ui/form-field/form-field';

@Component({
  selector: 'app-rule-catalog-settings',
  imports: [ReactiveFormsModule, ButtonDirective, FormField],
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
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly newType = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly newLanguage = new FormControl('', {
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

  private async add(
    category: 'creature_type' | 'creature_subspecies' | 'language',
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
      await this.load(this.system().id, this.universe().id);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Impossible d’ajouter cette valeur.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private async load(gameSystemId: string, universeId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const [alignments, sizes, creatureTypes, subspecies, languages] = await Promise.all([
        this.service.listForSystem(gameSystemId, 'alignment'),
        this.service.listForSystem(gameSystemId, 'size'),
        this.service.listForUniverse(gameSystemId, universeId, 'creature_type'),
        this.service.listForUniverse(gameSystemId, universeId, 'creature_subspecies'),
        this.service.listForUniverse(gameSystemId, universeId, 'language'),
      ]);
      this.alignments.set(alignments);
      this.sizes.set(sizes);
      this.creatureTypes.set(creatureTypes);
      this.subspecies.set(subspecies);
      this.languages.set(languages);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Impossible de charger les référentiels.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
