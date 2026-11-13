import { Component, effect, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { ItemConfigurationService } from '@app/features/items/application/item-configuration.service';
import type {
  ItemConfigurationKind,
  ItemConfigurationOption,
} from '@app/features/items/domain/item-configuration';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { FormField } from '@app/shared/ui/form-field/form-field';
import { errorMessage } from '@app/shared/error-message';

const ERROR_FALLBACK = 'Impossible de modifier la configuration.';

type ConfigurationSection = Readonly<{
  kind: ItemConfigurationKind;
  title: string;
  description: string;
}>;

@Component({
  selector: 'app-item-configuration-settings',
  imports: [ReactiveFormsModule, ButtonDirective, Dialog, FormField],
  templateUrl: './item-configuration-settings.html',
  styleUrl: './item-configuration-settings.scss',
})
export class ItemConfigurationSettings {
  private readonly service = inject(ItemConfigurationService);

  readonly universeId = input.required<string>();
  readonly universeName = input('cet univers');
  readonly showHeading = input(true);

  protected readonly sections: readonly ConfigurationSection[] = [
    {
      kind: 'type',
      title: "Types d'objets",
      description: 'Armes, armures, documents et autres familles de cet univers.',
    },
    {
      kind: 'rarity',
      title: 'Raretés des objets',
      description: 'Niveaux de rareté proposés pour les objets narratifs.',
    },
  ];
  protected readonly options = signal<
    Readonly<Record<ItemConfigurationKind, readonly ItemConfigurationOption[]>>
  >({ type: [], rarity: [] });
  protected readonly expanded = signal<ReadonlySet<ItemConfigurationKind>>(new Set(['type']));
  protected readonly editing = signal<ItemConfigurationOption | null>(null);
  protected readonly pendingDeletion = signal<ItemConfigurationOption | null>(null);
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  constructor() {
    effect(() => void this.initialize(this.universeId()));
  }

  protected toggle(kind: ItemConfigurationKind): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  protected startCreate(kind: ItemConfigurationKind): void {
    this.editing.set({
      id: '',
      universeId: this.universeId(),
      kind,
      name: '',
      createdAt: '',
      updatedAt: '',
    });
    this.nameControl.reset('');
  }

  protected startRename(option: ItemConfigurationOption): void {
    this.editing.set(option);
    this.nameControl.reset(option.name);
  }

  protected cancelEditing(): void {
    this.editing.set(null);
    this.nameControl.reset('');
  }

  protected async save(): Promise<void> {
    const editing = this.editing();
    if (!editing || this.nameControl.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      if (editing.id) await this.service.rename(editing, this.nameControl.value);
      else await this.service.create(this.universeId(), editing.kind, this.nameControl.value);
      await this.reload();
      this.cancelEditing();
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async confirmDelete(): Promise<void> {
    const option = this.pendingDeletion();
    if (!option || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      await this.service.delete(option);
      this.pendingDeletion.set(null);
      await this.reload();
    } catch (error) {
      this.pendingDeletion.set(null);
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    } finally {
      this.isSaving.set(false);
    }
  }

  private async initialize(universeId: string): Promise<void> {
    try {
      await this.service.ensureDefaults(universeId);
      await this.reload();
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    }
  }

  private async reload(): Promise<void> {
    const [type, rarity] = await Promise.all([
      this.service.list(this.universeId(), 'type'),
      this.service.list(this.universeId(), 'rarity'),
    ]);
    this.options.set({ type, rarity });
  }
}
