import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { CampaignMap } from '@app/features/campaign-map/domain/campaign-map';

export type CampaignMapVariant = 'full' | 'compact';

@Component({
  selector: 'app-campaign-map-tree',
  imports: [RouterLink],
  templateUrl: './campaign-map-tree.html',
  styleUrl: './campaign-map-tree.scss',
})
export class CampaignMapTree {
  readonly map = input.required<CampaignMap>();
  readonly variant = input<CampaignMapVariant>('full');
}
