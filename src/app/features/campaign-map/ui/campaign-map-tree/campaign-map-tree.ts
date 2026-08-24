import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type {
  CampaignMap,
  CampaignMapResource,
} from '@app/features/campaign-map/domain/campaign-map';
import {
  resourceRouteSegment,
  resourceTypeLabel,
} from '@app/shared/rich-text-editor/resource-mention';

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

  protected resourceSegment(resource: CampaignMapResource): string {
    return resourceRouteSegment(resource.resourceType);
  }

  protected resourceTypeLabel(resource: CampaignMapResource): string {
    return resourceTypeLabel(resource.resourceType);
  }
}
