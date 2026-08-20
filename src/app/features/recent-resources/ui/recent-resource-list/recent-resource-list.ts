import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RecentResourceStore } from '@app/features/recent-resources/application/recent-resource.store';
import {
  recentResourceSegment,
  recentResourceTypeLabel,
  type RecentResourceType,
} from '@app/features/recent-resources/domain/recent-resource';

@Component({
  selector: 'app-recent-resource-list',
  imports: [RouterLink],
  templateUrl: './recent-resource-list.html',
  styleUrl: './recent-resource-list.scss',
})
export class RecentResourceList {
  protected readonly store = inject(RecentResourceStore);

  protected segment(resourceType: RecentResourceType): string {
    return recentResourceSegment(resourceType);
  }

  protected typeLabel(resourceType: RecentResourceType): string {
    return recentResourceTypeLabel(resourceType);
  }
}
