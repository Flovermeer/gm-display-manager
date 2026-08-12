import { CampaignMediaGateway } from './campaign-media.gateway';

export class BrowserCampaignMediaGateway extends CampaignMediaGateway {
  override discardCampaign(): Promise<void> {
    return Promise.resolve();
  }
}
