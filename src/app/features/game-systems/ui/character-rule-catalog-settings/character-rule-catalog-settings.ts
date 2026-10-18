import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { GameRuleOptionService } from '@app/features/game-systems/application/game-rule-option.service';
import type { GameRuleOption } from '@app/features/game-systems/domain/game-rule-option';
import type { GameUniverse } from '@app/features/game-systems/domain/game-system';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { FormField } from '@app/shared/ui/form-field/form-field';
import { TagPill } from '@app/shared/ui/tag-pill/tag-pill';

export type CharacterRuleCategory = 'race' | 'class';

@Component({
  selector: 'app-character-rule-catalog-settings',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonDirective, Dialog, FormField, TagPill],
  templateUrl: './character-rule-catalog-settings.html',
  styleUrl: './character-rule-catalog-settings.scss',
})
export class CharacterRuleCatalogSettings {
  private readonly service = inject(GameRuleOptionService);

  readonly universe = input.required<GameUniverse>();
  readonly universes = input.required<readonly GameUniverse[]>();
  readonly category = input.required<CharacterRuleCategory>();

  protected readonly options = signal<readonly GameRuleOption[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly pendingRemoval = signal<GameRuleOption | null>(null);
  protected readonly newOption = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly title = computed(() => (this.category() === 'race' ? 'Races' : 'Classes'));
  protected readonly singularLabel = computed(() =>
    this.category() === 'race' ? 'race' : 'classe',
  );

  constructor() {
    effect(() => {
      const universe = this.universe();
      const category = this.category();
      void this.load(universe.gameSystemId, universe.id, category);
    });
  }

  protected origin(option: GameRuleOption): string {
    if (!option.universeId) return 'Système de jeu';
    return this.universes().find(({ id }) => id === option.universeId)?.name ?? 'Univers inconnu';
  }

  protected isOwnedBySelectedUniverse(option: GameRuleOption): boolean {
    return option.universeId === this.universe().id;
  }

  protected async add(): Promise<void> {
    if (this.newOption.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const universe = this.universe();
      await this.service.addForUniverse(
        universe.gameSystemId,
        universe.id,
        this.category(),
        this.newOption.value,
      );
      this.newOption.reset('');
      await this.load(universe.gameSystemId, universe.id, this.category(), false);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Impossible d’ajouter cette valeur.');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected requestRemoval(option: GameRuleOption): void {
    if (!this.isOwnedBySelectedUniverse(option)) return;
    this.pendingRemoval.set(option);
    this.error.set(null);
  }

  protected async confirmRemoval(): Promise<void> {
    const option = this.pendingRemoval();
    if (!option || !this.isOwnedBySelectedUniverse(option) || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      await this.service.removeFromUniverse(option);
      this.pendingRemoval.set(null);
      const universe = this.universe();
      await this.load(universe.gameSystemId, universe.id, this.category(), false);
    } catch (error) {
      this.pendingRemoval.set(null);
      this.error.set(
        error instanceof Error ? error.message : 'Impossible de supprimer cette valeur.',
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  private async load(
    gameSystemId: string,
    universeId: string,
    category: CharacterRuleCategory,
    showLoading = true,
  ): Promise<void> {
    if (showLoading) this.isLoading.set(true);
    this.error.set(null);
    try {
      this.options.set(await this.service.listForUniverse(gameSystemId, universeId, category));
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Impossible de charger le référentiel.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
