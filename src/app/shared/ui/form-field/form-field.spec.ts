import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { FormField } from '@app/shared/ui/form-field/form-field';

@Component({
  imports: [ReactiveFormsModule, FormField],
  template: `
    <app-form-field
      inputId="test-field"
      label="Nom"
      [formControl]="control"
      [errorMessage]="control.invalid ? 'Le nom est obligatoire.' : null"
    />
    <app-form-field
      inputId="number-field"
      label="Niveau"
      controlType="number"
      [formControl]="numberControl"
    />
    <app-form-field
      inputId="select-field"
      label="Parent"
      controlType="select"
      emptyLabel="Aucun"
      [options]="[{ value: 'parent-id', label: 'Parent' }]"
      [formControl]="selectControl"
    />
  `,
})
class TestHost {
  readonly control = new FormControl('Valeur initiale', Validators.required);
  readonly numberControl = new FormControl<number | null>(null);
  readonly selectControl = new FormControl<string | null>('parent-id');
}

describe('FormField', () => {
  let fixture: ComponentFixture<TestHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHost] }).compileComponents();
    fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
  });

  it('connects a shared input to an Angular form control', () => {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input')!;
    expect(input.value).toBe('Valeur initiale');

    input.value = 'Nouvelle valeur';
    input.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.control.value).toBe('Nouvelle valeur');
  });

  it('propagates the touched state to the parent form control', () => {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input')!;
    input.dispatchEvent(new Event('blur'));

    expect(fixture.componentInstance.control.touched).toBe(true);
  });

  it('keeps numeric form values typed as numbers', () => {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#number-field',
    )!;
    input.value = '7';
    input.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.numberControl.value).toBe(7);
  });

  it('selects an initial value when options are rendered dynamically', () => {
    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(
      '#select-field',
    )!;

    expect(select.value).toBe('parent-id');
  });

  it('maps an empty select option back to null', () => {
    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(
      '#select-field',
    )!;
    select.value = 'parent-id';
    select.dispatchEvent(new Event('change'));
    expect(fixture.componentInstance.selectControl.value).toBe('parent-id');

    select.selectedIndex = 0;
    select.dispatchEvent(new Event('change'));
    expect(fixture.componentInstance.selectControl.value).toBeNull();
  });
});
