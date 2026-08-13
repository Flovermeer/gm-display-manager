import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type FormFieldControlType = 'text' | 'select' | 'textarea';
export type FormFieldOption = Readonly<{ value: string; label: string }>;

const EMPTY_OPTION_VALUE = '__form_field_empty_option__';

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.html',
  styleUrl: './form-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormField),
      multi: true,
    },
  ],
})
export class FormField implements ControlValueAccessor {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly controlType = input<FormFieldControlType>('text');
  readonly options = input<readonly FormFieldOption[]>([]);
  readonly emptyLabel = input<string | null>(null);
  readonly emptyValue = input<string | null>(null);
  readonly placeholder = input('');
  readonly autocomplete = input('off');
  readonly errorMessage = input<string | null>(null);

  protected readonly value = signal<string | null>('');
  protected readonly disabled = signal(false);
  protected readonly emptyOptionValue = EMPTY_OPTION_VALUE;

  private onChange: (value: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value);
  }

  registerOnChange(onChange: (value: string | null) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected updateText(event: Event): void {
    this.updateValue((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }

  protected updateSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.updateValue(value === EMPTY_OPTION_VALUE ? this.emptyValue() : value);
  }

  protected selectValue(): string | null {
    if (this.emptyLabel() !== null && this.value() === this.emptyValue()) {
      return EMPTY_OPTION_VALUE;
    }
    return this.value();
  }

  protected markTouched(): void {
    this.onTouched();
  }

  private updateValue(value: string | null): void {
    this.value.set(value);
    this.onChange(value);
  }
}
