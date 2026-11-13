import { Component, input, output } from '@angular/core';

import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';

@Component({
  selector: 'app-pending-changes-dialog',
  imports: [ButtonDirective, Dialog],
  templateUrl: './pending-changes-dialog.html',
  styleUrl: './pending-changes-dialog.scss',
})
export class PendingChangesDialog {
  readonly headingId = input.required<string>();
  readonly message = input.required<string>();
  readonly title = input('Que veux-tu faire ?');
  readonly saving = input(false);

  readonly save = output();
  readonly discard = output();
  readonly keepEditing = output();
}
