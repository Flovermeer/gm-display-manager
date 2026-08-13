import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { CampaignContext } from '../campaign-layout/campaign-context';
import type {
  ItemConfigurationKind,
  ItemConfigurationOption,
} from '../narrative-item/item-configuration';
import { ItemConfigurationService } from '../narrative-item/item-configuration.service';
import { ButtonDirective } from '../shared/ui/button/button.directive';
import { Dialog } from '../shared/ui/dialog/dialog';

type ConfigurationSection = Readonly<{
  kind: ItemConfigurationKind;
  title: string;
  description: string;
}>;

@Component({
  selector: 'app-campaign-configuration-workspace',
  imports: [ReactiveFormsModule, ButtonDirective, Dialog],
  templateUrl: './campaign-configuration-workspace.html',
  styleUrl: './campaign-configuration-workspace.scss',
})
export class CampaignConfigurationWorkspace implements OnInit {
  private readonly campaignContext = inject(CampaignContext);
  private readonly configurationService = inject(ItemConfigurationService);

  protected readonly sections: readonly ConfigurationSection[] = [
    {
      kind: 'type',
      title: "Types d'objets",
      description: 'Armes, armures, documents et autres familles propres à cet univers.',
    },
    {
      kind: 'rarity',
      title: 'Raretés des objets',
      description: 'Niveaux de rareté proposés lors de la création des objets narratifs.',
    },
  ];
  protected readonly campaign = this.campaignContext.campaign;
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

  ngOnInit(): void {
    void this.initialize();
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
      campaignId: this.campaign()?.id ?? '',
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
    const campaign = this.campaign();
    const editing = this.editing();
    if (!campaign || !editing || this.nameControl.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      if (editing.id) await this.configurationService.rename(editing, this.nameControl.value);
      else
        await this.configurationService.create(campaign.id, editing.kind, this.nameControl.value);
      await this.reload();
      this.cancelEditing();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected requestDelete(option: ItemConfigurationOption): void {
    this.pendingDeletion.set(option);
  }

  protected async confirmDelete(): Promise<void> {
    const option = this.pendingDeletion();
    if (!option || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      await this.configurationService.delete(option);
      this.pendingDeletion.set(null);
      await this.reload();
    } catch (error) {
      this.pendingDeletion.set(null);
      this.error.set(errorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  private async initialize(): Promise<void> {
    try {
      const campaign = await this.campaignContext.load();
      if (!campaign) return;
      await this.configurationService.ensureDefaults(campaign.id);
      await this.reload();
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private async reload(): Promise<void> {
    const campaign = this.campaign();
    if (!campaign) return;
    const [type, rarity] = await Promise.all([
      this.configurationService.list(campaign.id, 'type'),
      this.configurationService.list(campaign.id, 'rarity'),
    ]);
    this.options.set({ type, rarity });
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Impossible de modifier la configuration.';
}
