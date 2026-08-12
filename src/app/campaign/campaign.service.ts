import { inject, Injectable } from '@angular/core';

import { AppSettingRepository } from '../persistence/app-setting.repository';
import { CampaignMediaGateway } from '../media/campaign-media.gateway';
import {
  createCampaign,
  updateCampaign,
  type Campaign,
  type CreateCampaignInput,
  type UpdateCampaignInput,
} from './campaign';
import { CampaignRepository } from './campaign.repository';

const ACTIVE_CAMPAIGN_KEY = 'campaign.active_id';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly campaignRepository = inject(CampaignRepository);
  private readonly appSettingRepository = inject(AppSettingRepository);
  private readonly campaignMediaGateway = inject(CampaignMediaGateway);

  list(): Promise<readonly Campaign[]> {
    return this.campaignRepository.list();
  }

  findById(id: string): Promise<Campaign | null> {
    return this.campaignRepository.findById(id);
  }

  getActiveCampaignId(): Promise<string | null> {
    return this.appSettingRepository.get(ACTIVE_CAMPAIGN_KEY);
  }

  async createAndActivate(input: CreateCampaignInput): Promise<Campaign> {
    const campaign = createCampaign(input);
    await this.campaignRepository.save(campaign);
    await this.activate(campaign.id);
    return campaign;
  }

  activate(campaignId: string): Promise<void> {
    return this.appSettingRepository.set(ACTIVE_CAMPAIGN_KEY, campaignId);
  }

  async update(campaign: Campaign, input: UpdateCampaignInput): Promise<Campaign> {
    const updatedCampaign = updateCampaign(campaign, input);
    await this.campaignRepository.save(updatedCampaign);
    return updatedCampaign;
  }

  async delete(campaign: Campaign): Promise<void> {
    await this.campaignRepository.delete(campaign.id);
    if ((await this.getActiveCampaignId()) === campaign.id) {
      await this.appSettingRepository.delete(ACTIVE_CAMPAIGN_KEY);
    }
    await this.campaignMediaGateway.discardCampaign(campaign.id);
  }
}
