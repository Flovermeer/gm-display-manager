import { Component, effect, inject, input, signal } from '@angular/core';

import { UniverseResourceService } from '@app/features/game-systems/application/universe-resource.service';
import type { GameUniverse } from '@app/features/game-systems/domain/game-system';
import {
  type UniverseResourceSummary,
  type UniverseResourceType,
} from '@app/features/game-systems/domain/universe-resource';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { ItemConfigurationSettings } from '@app/features/items/ui/item-configuration-settings/item-configuration-settings';

type CatalogSection = Readonly<{
  type: UniverseResourceType;
  label: string;
  emptyLabel: string;
}>;

@Component({
  selector: 'app-universe-resource-catalog',
  imports: [ButtonDirective, Dialog, ItemConfigurationSettings],
  templateUrl: './universe-resource-catalog.html',
  styleUrl: './universe-resource-catalog.scss',
})
export class UniverseResourceCatalog {
  private readonly service = inject(UniverseResourceService);

  readonly universe = input.required<GameUniverse>();

  protected readonly sections: readonly CatalogSection[] = [
    { type: 'npc', label: 'PNJ', emptyLabel: 'Aucun PNJ canonique.' },
    { type: 'player-character', label: 'PJ', emptyLabel: 'Aucun PJ canonique.' },
    { type: 'location', label: 'Lieux', emptyLabel: 'Aucun lieu canonique.' },
    { type: 'item', label: 'Objets', emptyLabel: 'Aucun objet canonique.' },
    { type: 'monster', label: 'Bestiaire', emptyLabel: 'Aucun monstre canonique.' },
  ];
  protected readonly selectedType = signal<UniverseResourceType>('npc');
  protected readonly resources = signal<readonly UniverseResourceSummary[]>([]);
  protected readonly pendingTrash = signal<UniverseResourceSummary | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const universeId = this.universe().id;
      const type = this.selectedType();
      void this.load(universeId, type);
    });
  }

  protected select(type: UniverseResourceType): void {
    this.selectedType.set(type);
  }

  protected sectionLabel(): string {
    return this.sections.find(({ type }) => type === this.selectedType())?.label ?? '';
  }

  protected emptyLabel(): string {
    return this.sections.find(({ type }) => type === this.selectedType())?.emptyLabel ?? '';
  }

  protected usageLabel(count: number): string {
    if (count === 0) return 'Aucune campagne';
    return count === 1 ? '1 campagne' : `${count} campagnes`;
  }

  protected async restore(resource: UniverseResourceSummary): Promise<void> {
    await this.run(async () => {
      await this.service.restore(resource);
      await this.reload();
    });
  }

  protected async confirmTrash(): Promise<void> {
    const resource = this.pendingTrash();
    if (!resource) return;
    await this.run(async () => {
      await this.service.trash(resource);
      this.pendingTrash.set(null);
      await this.reload();
    });
  }

  private async reload(): Promise<void> {
    await this.load(this.universe().id, this.selectedType());
  }

  private async load(universeId: string, type: UniverseResourceType): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      this.resources.set(await this.service.list(universeId, type));
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Impossible de charger le catalogue.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private async run(action: () => Promise<void>): Promise<void> {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Impossible de modifier le catalogue.',
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
