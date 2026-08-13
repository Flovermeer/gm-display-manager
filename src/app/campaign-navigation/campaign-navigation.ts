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
  readonly campaignId = input.required<string>();
  readonly activeSection = input<'control' | 'locations' | 'npcs' | 'player-characters'>('control');
}
