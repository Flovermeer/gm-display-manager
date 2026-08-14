/**
 * But
 * Orchestre le cycle de vie des campagnes.
 *
 * Responsabilités
 * - applique les règles applicatives de création et de modification ;
 * - coordonne la persistance, la campagne active et les médias associés ;
 * - ne contient aucun accès direct à SQLite ou au filesystem ;
 */

import { inject, Injectable } from '@angular/core';

import { AppSettingRepository } from '@app/core/persistence/app-setting.repository';
import {
  createCampaign,
  updateCampaign,
  type Campaign,
  type CreateCampaignInput,
  type UpdateCampaignInput,
} from '@app/features/campaigns/domain/campaign';
import { CampaignRepository } from '@app/features/campaigns/data-access/campaign.repository';

const ACTIVE_CAMPAIGN_KEY = 'campaign.active_id';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly campaignRepository = inject(CampaignRepository);
  private readonly appSettingRepository = inject(AppSettingRepository);

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
  }
}
