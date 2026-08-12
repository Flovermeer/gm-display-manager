import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-campaign-navigation',
  imports: [RouterLink],
  templateUrl: './campaign-navigation.html',
  styleUrl: './campaign-navigation.scss',
})
export class CampaignNavigation {
  readonly campaignName = input.required<string>();

  protected scrollTo(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({ block: 'start' });
  }
}
