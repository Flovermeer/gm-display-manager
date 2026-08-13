import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dialog {
  readonly kicker = input.required<string>();
  readonly title = input.required<string>();
  readonly headingId = input.required<string>();
}
