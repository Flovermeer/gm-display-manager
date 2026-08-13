import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { FormField } from './form-field';

@Component({
  imports: [ReactiveFormsModule, FormField],
  template: `
    <app-form-field
      inputId="test-field"
      label="Nom"
      [formControl]="control"
      [errorMessage]="control.invalid ? 'Le nom est obligatoire.' : null"
    />
  `,
})
class TestHost {
  readonly control = new FormControl('Valeur initiale', Validators.required);
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
});
