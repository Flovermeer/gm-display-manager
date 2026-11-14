import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidationErrors,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import type { PendingChangesAware } from '@app/core/navigation/pending-changes.guard';
import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { RandomTableService } from '@app/features/random-tables/application/random-table.service';
import {
  randomTableRangeLabel,
  randomTableRollIssue,
  RANDOM_TABLE_MAXIMUM,
  type RandomTable,
  type RandomTableEntry,
  type RandomTableInput,
  type RandomTableRoll,
} from '@app/features/random-tables/domain/random-table';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { EmptyState } from '@app/shared/ui/empty-state/empty-state';
import { EntityTitle } from '@app/shared/ui/entity-title/entity-title';
import { FormField } from '@app/shared/ui/form-field/form-field';
import { errorMessage } from '@app/shared/error-message';
import { PendingChangesPrompt } from '@app/core/navigation/pending-changes-prompt';
import { PendingChangesDialog } from '@app/shared/ui/pending-changes-dialog/pending-changes-dialog';

type EntryForm = FormGroup<{
  id: FormControl<string>;
  minimum: FormControl<number | null>;
  maximum: FormControl<number | null>;
  resultText: FormControl<string>;
}>;

@Component({
  selector: 'app-random-table-workspace',
  imports: [
    PendingChangesDialog,
    ReactiveFormsModule,
    ButtonDirective,
    Dialog,
    EmptyState,
    EntityTitle,
    FormField,
  ],
  templateUrl: './random-table-workspace.html',
  styleUrl: './random-table-workspace.scss',
})
export class RandomTableWorkspace implements OnInit, PendingChangesAware {
  private readonly campaignContext = inject(CampaignContext);
  private readonly service = inject(RandomTableService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tables = signal<readonly RandomTable[]>([]);
  protected readonly selectedTable = signal<RandomTable | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly isSidebarCollapsed = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly showDeleteDialog = signal(false);
  protected readonly pendingChanges = new PendingChangesPrompt();
  protected readonly lastRoll = signal<RandomTableRoll | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly maximumBound = RANDOM_TABLE_MAXIMUM;

  protected readonly tableForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    entries: new FormArray<EntryForm>([]),
  });

  protected readonly filteredTables = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('fr');
    if (!term) return this.tables();
    return this.tables().filter(({ name, description }) =>
      [name, description].some((value) => value.toLocaleLowerCase('fr').includes(term)),
    );
  });

  ngOnInit(): void {
    // Une mention « @ » ouvre la page avec `resourceId` ; on suit aussi les changements suivants.
    this.route.queryParamMap
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => void this.openRequestedTable(params.get('resourceId')));
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

  protected async requestSelectTable(table: RandomTable): Promise<void> {
    if (this.selectedTable()?.id === table.id && !this.isCreating()) return;
    if (await this.confirmPendingChanges()) this.openReadOnly(table);
  }

  protected async requestCreateTable(): Promise<void> {
    if (!(await this.confirmPendingChanges())) return;
    this.selectedTable.set(null);
    this.isCreating.set(true);
    this.isEditing.set(true);
    this.lastRoll.set(null);
    this.populateDraft(null);
  }

  protected editTable(): void {
    const table = this.selectedTable();
    if (!table) return;
    this.isCreating.set(false);
    this.isEditing.set(true);
    this.populateDraft(table);
  }

  protected cancelEditing(): void {
    const selected = this.selectedTable();
    this.isEditing.set(false);
    this.isCreating.set(false);
    if (selected) this.populateDraft(selected);
    else this.populateDraft(null);
  }

  protected addEntry(): void {
    this.tableForm.controls.entries.push(createEntryForm());
    this.tableForm.markAsDirty();
  }

  protected removeEntry(index: number): void {
    this.tableForm.controls.entries.removeAt(index);
    this.tableForm.markAsDirty();
  }

  protected sortEntries(): void {
    const entries = this.tableForm.controls.entries;
    const current = [...entries.controls];
    const sorted = current
      .map((control, index) => ({ control, index }))
      .sort(
        (left, right) =>
          nullableOrder(
            left.control.controls.minimum.value,
            right.control.controls.minimum.value,
          ) ||
          nullableOrder(
            left.control.controls.maximum.value,
            right.control.controls.maximum.value,
          ) ||
          left.index - right.index,
      )
      .map(({ control }) => control);
    if (sorted.every((control, index) => control === current[index])) return;
    entries.clear({ emitEvent: false });
    for (const control of sorted) entries.push(control, { emitEvent: false });
    this.tableForm.markAsDirty();
  }

  protected async saveTable(): Promise<boolean> {
    if (this.tableForm.invalid || this.isSaving()) {
      this.tableForm.markAllAsTouched();
      return false;
    }
    const campaign = this.campaignContext.campaign();
    if (!campaign) return false;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const selected = this.selectedTable();
      const saved = selected
        ? await this.service.update(selected, this.formInput())
        : await this.service.create(campaign.id, this.formInput());
      await this.reloadTables();
      this.openReadOnly(saved);
      return true;
    } catch (error) {
      this.error.set(errorMessage(error));
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  protected roll(table: RandomTable): void {
    this.error.set(null);
    try {
      this.lastRoll.set(this.service.roll(table));
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  protected rollIssue(table: RandomTable): string | null {
    return randomTableRollIssue(table);
  }

  protected rangeLabel(entry: RandomTableEntry): string {
    return randomTableRangeLabel(entry);
  }

  protected maximum(table: RandomTable): number | null {
    return table.entries.at(-1)?.maximum ?? null;
  }

  protected requestDeleteTable(): void {
    if (this.selectedTable()) this.showDeleteDialog.set(true);
  }

  protected async confirmDeleteTable(): Promise<void> {
    const table = this.selectedTable();
    if (!table || this.isSaving()) return;
    this.isSaving.set(true);
    this.error.set(null);
    try {
      await this.service.delete(table);
      await this.reloadTables();
      this.selectedTable.set(null);
      this.lastRoll.set(null);
      this.showDeleteDialog.set(false);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected continueEditing(): void {
    this.pendingChanges.resolve(false);
  }

  protected leaveWithoutSaving(): void {
    this.cancelEditing();
    this.pendingChanges.resolve(true);
  }

  protected async saveAndLeave(): Promise<void> {
    if (await this.saveTable()) this.pendingChanges.resolve(true);
  }

  private async initialize(): Promise<void> {
    try {
      const campaign = await this.campaignContext.load();
      if (!campaign) return;
      this.tables.set(await this.service.list(campaign.id));
      await this.openRequestedTable(this.route.snapshot.queryParamMap?.get('resourceId') ?? null);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async openRequestedTable(resourceId: string | null): Promise<void> {
    const table = this.tables().find(({ id }) => id === resourceId);
    if (!table || (table.id === this.selectedTable()?.id && !this.isCreating())) return;
    if (await this.confirmPendingChanges()) this.openReadOnly(table);
  }

  private async reloadTables(): Promise<void> {
    const campaign = this.campaignContext.campaign();
    if (campaign) this.tables.set(await this.service.list(campaign.id));
  }

  private openReadOnly(table: RandomTable): void {
    const refreshed = this.tables().find(({ id }) => id === table.id) ?? table;
    this.selectedTable.set(refreshed);
    this.isCreating.set(false);
    this.isEditing.set(false);
    this.lastRoll.set(null);
    this.populateDraft(refreshed);
  }

  private populateDraft(table: RandomTable | null): void {
    this.tableForm.controls.name.setValue(table?.name ?? '');
    this.tableForm.controls.description.setValue(table?.description ?? '');
    const entries = this.tableForm.controls.entries;
    entries.clear({ emitEvent: false });
    for (const entry of table?.entries ?? [])
      entries.push(createEntryForm(entry), { emitEvent: false });
    this.tableForm.markAsPristine();
  }

  private formInput(): RandomTableInput {
    const value = this.tableForm.getRawValue();
    return {
      name: value.name,
      description: value.description,
      entries: value.entries,
    };
  }

  private confirmPendingChanges(): boolean | Promise<boolean> {
    if (!this.isEditing() || !this.tableForm.dirty) return true;
    return this.pendingChanges.request();
  }
}

function createEntryForm(entry?: RandomTableEntry): EntryForm {
  return new FormGroup(
    {
      id: new FormControl(entry?.id ?? crypto.randomUUID(), { nonNullable: true }),
      minimum: new FormControl<number | null>(entry?.minimum ?? null, [
        Validators.min(1),
        Validators.max(RANDOM_TABLE_MAXIMUM),
        integerValidator,
      ]),
      maximum: new FormControl<number | null>(entry?.maximum ?? null, [
        Validators.min(1),
        Validators.max(RANDOM_TABLE_MAXIMUM),
        integerValidator,
      ]),
      resultText: new FormControl(entry?.resultText ?? '', { nonNullable: true }),
    },
    { validators: rangeOrderValidator },
  );
}

const integerValidator: ValidatorFn = (control): ValidationErrors | null => {
  const value: unknown = control.value;
  return value === null || (typeof value === 'number' && Number.isSafeInteger(value))
    ? null
    : { integer: true };
};

const rangeOrderValidator: ValidatorFn = (control): ValidationErrors | null => {
  const entry = control as EntryForm;
  const minimum = entry.controls.minimum.value;
  const maximum = entry.controls.maximum.value;
  return minimum !== null && maximum !== null && minimum > maximum ? { rangeOrder: true } : null;
};

function nullableOrder(left: number | null, right: number | null): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  return left - right;
}
