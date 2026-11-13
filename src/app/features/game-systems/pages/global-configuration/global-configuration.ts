import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { GameSystemService } from '@app/features/game-systems/application/game-system.service';
import {
  isGenericUniverse,
  type GameSystem,
  type GameUniverse,
} from '@app/features/game-systems/domain/game-system';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { FormField } from '@app/shared/ui/form-field/form-field';
import { RuleCatalogSettings } from '@app/features/game-systems/ui/rule-catalog-settings/rule-catalog-settings';
import { UniverseResourceCatalog } from '@app/features/game-systems/ui/universe-resource-catalog/universe-resource-catalog';
import type { PendingChangesAware } from '@app/core/navigation/pending-changes.guard';
import { BackupSettings } from '@app/features/backups/ui/backup-settings/backup-settings';
import { DiagnosticSettings } from '@app/features/diagnostics/ui/diagnostic-settings/diagnostic-settings';
import { errorMessage } from '@app/shared/error-message';

const ERROR_FALLBACK = 'Impossible de modifier la configuration.';

type ConfigurationSection = 'systems' | 'resources' | 'rules' | 'backups' | 'diagnostics';

type PurgeTarget =
  | Readonly<{ kind: 'system'; item: GameSystem }>
  | Readonly<{ kind: 'universe'; item: GameUniverse }>;

@Component({
  selector: 'app-global-configuration',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonDirective,
    Dialog,
    FormField,
    RuleCatalogSettings,
    UniverseResourceCatalog,
    BackupSettings,
    DiagnosticSettings,
  ],
  templateUrl: './global-configuration.html',
  styleUrl: './global-configuration.scss',
})
export class GlobalConfiguration implements OnInit, PendingChangesAware {
  private readonly service = inject(GameSystemService);
  private readonly resourceCatalog = viewChild(UniverseResourceCatalog);

  protected readonly systems = signal<readonly GameSystem[]>([]);
  protected readonly universes = signal<readonly GameUniverse[]>([]);
  protected readonly selectedSystemId = signal<string | null>(null);
  protected readonly selectedUniverseId = signal<string | null>(null);
  protected readonly section = signal<ConfigurationSection>('systems');
  protected readonly selectedSystem = computed(
    () => this.systems().find(({ id }) => id === this.selectedSystemId()) ?? null,
  );
  protected readonly selectedUniverse = computed(
    () => this.universes().find(({ id }) => id === this.selectedUniverseId()) ?? null,
  );
  protected readonly managedUniverses = computed(() =>
    this.universes().filter((universe) => !isGenericUniverse(universe)),
  );
  protected readonly catalogUniverses = computed(() =>
    this.universes().filter(({ deletedAt }) => !deletedAt),
  );
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly purgeTarget = signal<PurgeTarget | null>(null);
  protected readonly newSystemName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly newUniverseName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  ngOnInit(): void {
    void this.loadSystems();
  }

  protected async selectSystem(id: string): Promise<void> {
    this.selectedSystemId.set(id);
    await this.loadUniverses(id);
  }

  protected async selectUniverse(id: string): Promise<void> {
    if (!(await this.confirmPendingChanges())) return;
    this.selectedUniverseId.set(id);
  }

  protected async openSection(section: ConfigurationSection): Promise<void> {
    if (!(await this.confirmPendingChanges())) return;
    this.section.set(section);
  }

  canDeactivate(): boolean | Promise<boolean> {
    return this.confirmPendingChanges();
  }

  private confirmPendingChanges(): boolean | Promise<boolean> {
    return this.resourceCatalog()?.confirmPendingChanges() ?? true;
  }

  protected async createSystem(): Promise<void> {
    if (this.newSystemName.invalid || this.isSubmitting()) return;
    await this.run(async () => {
      const item = await this.service.createSystem(this.newSystemName.getRawValue());
      this.newSystemName.reset('');
      await this.loadSystems(item.id);
    });
  }

  protected async renameSystem(item: GameSystem): Promise<void> {
    const name = window.prompt('Nouveau nom du système de jeu', item.name)?.trim();
    if (!name || name === item.name) return;
    await this.run(async () => {
      await this.service.renameSystem(item, name);
      await this.loadSystems(item.id);
    });
  }

  protected async trashSystem(item: GameSystem): Promise<void> {
    await this.run(async () => {
      await this.service.trashSystem(item.id);
      await this.loadSystems();
    });
  }

  protected async restoreSystem(item: GameSystem): Promise<void> {
    await this.run(async () => {
      await this.service.restoreSystem(item.id);
      await this.loadSystems(item.id);
    });
  }

  protected async createUniverse(): Promise<void> {
    const system = this.selectedSystem();
    if (!system || this.newUniverseName.invalid || this.isSubmitting()) return;
    await this.run(async () => {
      await this.service.createUniverse(system.id, this.newUniverseName.getRawValue());
      this.newUniverseName.reset('');
      await this.loadUniverses(system.id);
    });
  }

  protected async renameUniverse(item: GameUniverse): Promise<void> {
    const name = window.prompt('Nouveau nom de l’univers', item.name)?.trim();
    if (!name || name === item.name) return;
    await this.run(async () => {
      await this.service.renameUniverse(item, name);
      await this.loadUniverses(item.gameSystemId);
    });
  }

  protected async trashUniverse(item: GameUniverse): Promise<void> {
    await this.run(async () => {
      await this.service.trashUniverse(item.id);
      await this.loadUniverses(item.gameSystemId);
    });
  }

  protected async restoreUniverse(item: GameUniverse): Promise<void> {
    await this.run(async () => {
      await this.service.restoreUniverse(item.id);
      await this.loadUniverses(item.gameSystemId);
    });
  }

  protected requestPurge(target: PurgeTarget): void {
    this.purgeTarget.set(target);
  }

  protected cancelPurge(): void {
    this.purgeTarget.set(null);
  }

  protected async confirmPurge(): Promise<void> {
    const target = this.purgeTarget();
    if (!target) return;
    await this.run(async () => {
      if (target.kind === 'system') await this.service.purgeSystem(target.item.id);
      else await this.service.purgeUniverse(target.item.id);
      this.purgeTarget.set(null);
      await this.loadSystems();
    });
  }

  private async loadSystems(preferredId?: string): Promise<void> {
    try {
      const systems = await this.service.listSystems(true);
      this.systems.set(systems);
      const selectedId =
        preferredId && systems.some(({ id }) => id === preferredId)
          ? preferredId
          : (systems.find(({ deletedAt }) => !deletedAt)?.id ?? systems[0]?.id ?? null);
      this.selectedSystemId.set(selectedId);
      await this.loadUniverses(selectedId);
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadUniverses(gameSystemId: string | null): Promise<void> {
    const universes = gameSystemId
      ? await this.service.listCatalogUniverses(gameSystemId, true)
      : [];
    this.universes.set(universes);
    const currentId = this.selectedUniverseId();
    this.selectedUniverseId.set(
      currentId && universes.some(({ id }) => id === currentId)
        ? currentId
        : (universes.find((universe) => !universe.deletedAt && isGenericUniverse(universe))?.id ??
            universes.find(({ deletedAt }) => !deletedAt)?.id ??
            universes[0]?.id ??
            null),
    );
  }

  private async run(action: () => Promise<void>): Promise<void> {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (error) {
      this.error.set(errorMessage(error, ERROR_FALLBACK));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
