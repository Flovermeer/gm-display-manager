import { Component, computed, input, output, signal } from '@angular/core';

import { TagPill } from '@app/shared/ui/tag-pill/tag-pill';

export type MultiSelectOption = Readonly<{ value: string; label: string }>;

@Component({
  selector: 'app-multi-select-field',
  imports: [TagPill],
  templateUrl: './multi-select-field.html',
  styleUrl: './multi-select-field.scss',
})
export class MultiSelectField {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input<readonly MultiSelectOption[]>([]);
  readonly value = input<readonly string[]>([]);
  readonly valueChange = output<readonly string[]>();
  protected readonly draft = signal('');
  protected readonly availableOptions = computed(() => {
    const selected = new Set(this.value());
    const term = this.draft().trim().toLocaleLowerCase('fr');
    return this.options().filter(
      (option) =>
        !selected.has(option.value) &&
        (!term || option.label.toLocaleLowerCase('fr').includes(term)),
    );
  });

  protected updateDraft(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  protected add(value: string): void {
    if (!value || this.value().includes(value)) return;
    this.valueChange.emit([...this.value(), value]);
    this.draft.set('');
  }

  protected remove(value: string): void {
    this.valueChange.emit(this.value().filter((candidate) => candidate !== value));
  }

  protected labelFor(value: string): string {
    return this.options().find((option) => option.value === value)?.label ?? value;
  }
}
