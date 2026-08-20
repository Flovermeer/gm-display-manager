import { Component, inject } from '@angular/core';

import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { ItemConfigurationSettings } from '@app/features/items/ui/item-configuration-settings/item-configuration-settings';

@Component({
  selector: 'app-campaign-configuration-workspace',
  imports: [ItemConfigurationSettings],
  templateUrl: './campaign-configuration-workspace.html',
  styleUrl: './campaign-configuration-workspace.scss',
})
export class CampaignConfigurationWorkspace {
  private readonly campaignContext = inject(CampaignContext);

  protected readonly campaign = this.campaignContext.campaign;
}
