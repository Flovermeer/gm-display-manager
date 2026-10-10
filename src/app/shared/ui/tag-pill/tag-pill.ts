import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-tag-pill',
  templateUrl: './tag-pill.html',
  styleUrl: './tag-pill.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagPill {
  readonly label = input.required<string>();
  readonly code = input('');
  readonly detail = input('');
  readonly variant = input<'default' | 'catalog'>('default');
  readonly removable = input(true);
  readonly removeVerb = input('Retirer');
  readonly remove = output<void>();
}
