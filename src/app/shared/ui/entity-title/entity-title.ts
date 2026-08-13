import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-entity-title',
  templateUrl: './entity-title.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityTitle {
  readonly kicker = input.required<string>();
  readonly title = input.required<string>();
  readonly headingId = input<string>();
  readonly compact = input(false);
}
