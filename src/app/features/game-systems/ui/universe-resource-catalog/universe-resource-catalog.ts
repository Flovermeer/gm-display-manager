import { Component, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';

import { UniverseResourceService } from '@app/features/game-systems/application/universe-resource.service';
import type { GameUniverse } from '@app/features/game-systems/domain/game-system';
import {
  type UniverseResourceDetail,
  type UniverseResourceSummary,
  type UniverseResourceType,
} from '@app/features/game-systems/domain/universe-resource';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { ItemConfigurationSettings } from '@app/features/items/ui/item-configuration-settings/item-configuration-settings';
import {
  CharacterRuleCatalogSettings,
  type CharacterRuleCategory,
} from '@app/features/game-systems/ui/character-rule-catalog-settings/character-rule-catalog-settings';
import { UniverseResourceEditor } from '@app/features/game-systems/ui/universe-resource-editor/universe-resource-editor';

type SharedCatalogType = UniverseResourceType | CharacterRuleCategory;

type CatalogSection = Readonly<{
  type: SharedCatalogType;
  label: string;
  emptyLabel: string;
}>;

@Component({
  selector: 'app-universe-resource-catalog',
  imports: [
    ButtonDirective,
    CharacterRuleCatalogSettings,
    Dialog,
    ItemConfigurationSettings,
    UniverseResourceEditor,
  ],
  templateUrl: './universe-resource-catalog.html',
  styleUrl: './universe-resource-catalog.scss',
})
export class UniverseResourceCatalog {
  private readonly service = inject(UniverseResourceService);
  private readonly editor = viewChild(UniverseResourceEditor);

  readonly universe = input.required<GameUniverse>();
  readonly universes = input.required<readonly GameUniverse[]>();
  readonly universeChange = output<string>();

  protected readonly sections: readonly CatalogSection[] = [
    { type: 'npc', label: 'PNJ', emptyLabel: 'Aucun PNJ canonique.' },
    { type: 'player-character', label: 'PJ', emptyLabel: 'Aucun PJ canonique.' },
    { type: 'race', label: 'Races', emptyLabel: 'Aucune race configurée.' },
    { type: 'class', label: 'Classes', emptyLabel: 'Aucune classe configurée.' },
    { type: 'location', label: 'Lieux', emptyLabel: 'Aucun lieu canonique.' },
    { type: 'item', label: 'Objets', emptyLabel: 'Aucun objet canonique.' },
    { type: 'monster', label: 'Bestiaire', emptyLabel: 'Aucun monstre canonique.' },
  ];
  protected readonly selectedType = signal<SharedCatalogType>('npc');
  protected readonly resources = signal<readonly UniverseResourceSummary[]>([]);
  protected readonly pendingTrash = signal<UniverseResourceSummary | null>(null);
  protected readonly editingResourceId = signal<string | null>(null);
  protected readonly editingUniverseId = signal<string | null>(null);
  protected readonly isCreating = signal(false);
  protected readonly isEditorOpen = computed(
    () => this.isCreating() || this.editingResourceId() !== null,
  );
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const universeId = this.universe().id;
      const type = this.selectedType();
      if (isCharacterRuleCategory(type)) {
        this.resources.set([]);
        this.isLoading.set(false);
      } else {
        void this.load(universeId, type);
      }
    });
  }

  protected select(type: SharedCatalogType): void {
    if (this.isEditorOpen()) return;
    this.selectedType.set(type);
  }

  protected createResource(): void {
    const type = this.resourceType();
    if (!type) return;
    this.editingResourceId.set(null);
    this.editingUniverseId.set(this.universe().id);
    this.isCreating.set(true);
  }

  protected editResource(resource: UniverseResourceSummary): void {
    if (resource.deletedAt) return;
    this.editingResourceId.set(resource.id);
    this.editingUniverseId.set(resource.universeId);
    this.isCreating.set(false);
  }

  protected closeEditor(): void {
    this.editingResourceId.set(null);
    this.editingUniverseId.set(null);
    this.isCreating.set(false);
  }

  protected async resourceSaved(resource: UniverseResourceDetail): Promise<void> {
    this.editingResourceId.set(resource.id);
    this.editingUniverseId.set(resource.universeId);
    this.isCreating.set(false);
    await this.reload();
  }

  confirmPendingChanges(): boolean | Promise<boolean> {
    return this.editor()?.confirmPendingChanges() ?? true;
  }

  protected sectionLabel(): string {
    return this.sections.find(({ type }) => type === this.selectedType())?.label ?? '';
  }

  protected emptyLabel(): string {
    return this.sections.find(({ type }) => type === this.selectedType())?.emptyLabel ?? '';
  }

  protected createLabel(): string {
    const type = this.resourceType();
    if (!type) return '';
    return {
      npc: 'Ajouter un PNJ',
      'player-character': 'Ajouter un PJ',
      location: 'Ajouter un lieu',
      item: 'Ajouter un objet',
      monster: 'Ajouter un monstre',
    }[type];
  }

  protected characterRuleCategory(): CharacterRuleCategory | null {
    const type = this.selectedType();
    return isCharacterRuleCategory(type) ? type : null;
  }

  protected usageLabel(count: number): string {
    if (count === 0) return 'Aucune campagne';
    return count === 1 ? '1 campagne' : `${count} campagnes`;
  }

  protected originLabel(resource: UniverseResourceSummary): string {
    return this.universes().find(({ id }) => id === resource.universeId)?.name ?? 'Univers inconnu';
  }

  protected changeUniverse(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id === this.universe().id) return;
    this.universeChange.emit(id);
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
    const type = this.resourceType();
    if (type) await this.load(this.universe().id, type);
  }

  protected resourceType(): UniverseResourceType | null {
    const type = this.selectedType();
    return isCharacterRuleCategory(type) ? null : type;
  }

  private async load(universeId: string, type: UniverseResourceType): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const universe = this.universes().find(({ id }) => id === universeId) ?? this.universe();
      this.resources.set(await this.service.listForCatalog(universe, type));
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

function isCharacterRuleCategory(type: SharedCatalogType): type is CharacterRuleCategory {
  return type === 'race' || type === 'class';
}
