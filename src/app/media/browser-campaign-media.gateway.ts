import { CampaignMediaGateway } from '@app/media/campaign-media.gateway';

export class BrowserCampaignMediaGateway extends CampaignMediaGateway {
  override discardCampaign(): Promise<void> {
    return Promise.resolve();
  }
}
