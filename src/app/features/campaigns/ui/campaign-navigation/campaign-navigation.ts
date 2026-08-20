import { Location } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-campaign-navigation',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './campaign-navigation.html',
  styleUrl: './campaign-navigation.scss',
})
export class CampaignNavigation {
  private readonly location = inject(Location);

  readonly campaignName = input.required<string>();
  readonly campaignId = input.required<string>();
  readonly combatOpen = input(false);
  readonly combatantCount = input(0);
  readonly combatToggle = output<void>();

  protected goBack(): void {
    this.location.back();
  }
}
