import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-campaign-navigation',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './campaign-navigation.html',
  styleUrl: './campaign-navigation.scss',
})
export class CampaignNavigation {
  readonly campaignName = input.required<string>();
  readonly campaignId = input.required<string>();
}
