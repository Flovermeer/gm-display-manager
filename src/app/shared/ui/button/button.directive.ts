import { booleanAttribute, Directive, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'secondary-danger';

@Directive({
  selector: 'button[appButton]',
  host: {
    '[class.ui-button]': 'true',
    '[class.ui-button--primary]': "variant() === 'primary'",
    '[class.ui-button--secondary]': "variant() === 'secondary'",
    '[class.ui-button--danger]': "variant() === 'danger'",
    '[class.ui-button--secondary-danger]': "variant() === 'secondary-danger'",
    '[class.ui-button--full]': 'fullWidth()',
  },
})
export class ButtonDirective {
  readonly variant = input<ButtonVariant>('secondary', { alias: 'appButton' });
  // Attribut préfixé comme le sélecteur pour rester lisible dans les templates : appButtonFull.
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly fullWidth = input(false, { alias: 'appButtonFull', transform: booleanAttribute });
}
