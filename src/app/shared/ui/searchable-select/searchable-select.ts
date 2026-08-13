import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { TagPill } from '@app/shared/ui/tag-pill/tag-pill';

export type SearchableSelectOption = Readonly<{ value: string; label: string }>;
type SearchableSelectValue = string | readonly string[] | null;

@Component({
  selector: 'app-searchable-select',
  imports: [TagPill],
  templateUrl: './searchable-select.html',
  styleUrl: './searchable-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelect),
      multi: true,
    },
  ],
})
export class SearchableSelect implements ControlValueAccessor {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input<readonly SearchableSelectOption[]>([]);
  readonly multiple = input(false);
  readonly placeholder = input('Rechercher…');
  readonly emptyMessage = input('Aucun résultat.');

  protected readonly query = signal('');
  protected readonly isOpen = signal(false);
  protected readonly disabled = signal(false);
  protected readonly selectedValues = signal<readonly string[]>([]);
  protected readonly selectedOptions = computed(() => {
    const selected = new Set(this.selectedValues());
    return this.options().filter(({ value }) => selected.has(value));
  });
  protected readonly filteredOptions = computed(() => {
    const selected = new Set(this.selectedValues());
    const query = this.query().trim().toLocaleLowerCase('fr');
    return this.options().filter(
      ({ value, label }) =>
        !selected.has(value) && (!query || label.toLocaleLowerCase('fr').includes(query)),
    );
  });

  private onChange: (value: SearchableSelectValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private closeTimer?: number;

  writeValue(value: SearchableSelectValue): void {
    this.selectedValues.set(
      Array.isArray(value) ? [...value] : typeof value === 'string' && value ? [value] : [],
    );
  }

  registerOnChange(onChange: (value: SearchableSelectValue) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected open(): void {
    if (this.disabled()) return;
    if (this.closeTimer) window.clearTimeout(this.closeTimer);
    this.isOpen.set(true);
  }

  protected scheduleClose(): void {
    this.onTouched();
    this.closeTimer = window.setTimeout(() => this.isOpen.set(false));
  }

  protected updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.open();
  }

  protected selectOption(value: string): void {
    const next = this.multiple() ? [...this.selectedValues(), value] : [value];
    this.commit(next);
    this.query.set('');
    this.isOpen.set(this.multiple());
  }

  protected removeOption(value: string): void {
    this.commit(this.selectedValues().filter((candidate) => candidate !== value));
  }

  protected handleEscape(): void {
    this.isOpen.set(false);
  }

  private commit(values: readonly string[]): void {
    this.selectedValues.set(values);
    this.onChange(this.multiple() ? values : (values[0] ?? null));
    this.onTouched();
  }
}
