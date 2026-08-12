export abstract class CampaignMediaGateway {
  abstract discardCampaign(campaignId: string): Promise<void>;
}
