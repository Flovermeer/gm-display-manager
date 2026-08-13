import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ButtonDirective } from '@app/shared/ui/button/button.directive';

@Component({
  imports: [ButtonDirective],
  template: `<button appButton="primary" type="button" [disabled]="true">Enregistrer</button>`,
})
class ButtonHost {}

describe('ButtonDirective', () => {
  it('styles a native button without replacing its behavior', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.classList).toContain('ui-button');
    expect(button.classList).toContain('ui-button--primary');
  });
});
