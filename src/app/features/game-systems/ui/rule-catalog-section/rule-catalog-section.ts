import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-rule-catalog-section',
  standalone: true,
  templateUrl: './rule-catalog-section.html',
  styleUrl: './rule-catalog-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuleCatalogSection {
  readonly title = input.required<string>();
}
