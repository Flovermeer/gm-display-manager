import {
  ChangeDetectionStrategy,
  Component,
  effect,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type FormFieldControlType = 'text' | 'number' | 'datetime-local' | 'select' | 'textarea';
export type FormFieldOption = Readonly<{ value: string; label: string }>;
export type FormFieldValue = string | number | null;

const EMPTY_OPTION_VALUE = '__form_field_empty_option__';

@Component({
  selector: 'app-form-field',
  host: { class: 'field' },
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
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  readonly step = input<number | null>(null);
  readonly value = input<FormFieldValue | undefined>(undefined);
  readonly valueChange = output<FormFieldValue>();
  readonly enterKey = output<void>();

  protected readonly controlValue = signal<FormFieldValue>('');
  protected readonly disabled = signal(false);
  protected readonly emptyOptionValue = EMPTY_OPTION_VALUE;

  private onChange: (value: FormFieldValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    effect(() => {
      const value = this.value();
      if (value !== undefined) this.controlValue.set(value);
    });
  }

  writeValue(value: FormFieldValue): void {
    this.controlValue.set(value);
  }

  registerOnChange(onChange: (value: FormFieldValue) => void): void {
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

  protected updateNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateValue(input.value === '' ? null : input.valueAsNumber);
  }

  protected updateSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.updateValue(value === EMPTY_OPTION_VALUE ? this.emptyValue() : value);
  }

  protected selectValue(): FormFieldValue {
    if (this.emptyLabel() !== null && this.controlValue() === this.emptyValue()) {
      return EMPTY_OPTION_VALUE;
    }
    return this.controlValue();
  }

  protected markTouched(): void {
    this.onTouched();
  }

  private updateValue(value: FormFieldValue): void {
    this.controlValue.set(value);
    this.onChange(value);
    this.valueChange.emit(value);
  }
}
