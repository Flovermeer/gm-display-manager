import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-tag-pill',
  templateUrl: './tag-pill.html',
  styleUrl: './tag-pill.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagPill {
  readonly label = input.required<string>();
  readonly removable = input(true);
  readonly remove = output<void>();
}
