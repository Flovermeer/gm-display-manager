import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Component } from '@angular/core';

import { SearchableSelect } from './searchable-select';

@Component({
  imports: [ReactiveFormsModule, SearchableSelect],
  template: `
    <app-searchable-select
      inputId="resources"
      label="Ressources"
      [multiple]="true"
      [options]="options"
      [formControl]="control"
    />
  `,
})
class TestHost {
  readonly control = new FormControl<readonly string[]>([], { nonNullable: true });
  readonly options = [
    { value: 'npc-1', label: 'Syndra Silvane' },
    { value: 'npc-2', label: 'Wakanga O’Tamu' },
  ];
}

describe('SearchableSelect', () => {
  it('filters, adds and removes selected options as pills', async () => {
    await TestBed.configureTestingModule({ imports: [TestHost] }).compileComponents();
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.focus();
    input.value = 'Syndra';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.searchable-select__option')).toHaveLength(1);

    (fixture.nativeElement.querySelector('.searchable-select__option') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.control.value).toEqual(['npc-1']);
    expect(fixture.nativeElement.querySelector('.tag-pill')?.textContent).toContain('Syndra');

    (fixture.nativeElement.querySelector('.tag-pill__remove') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.control.value).toEqual([]);
  });
});
