export const DEFAULT_CAMPAIGN_SYSTEM_KEY = 'dnd5e';

export type Campaign = Readonly<{
  id: string;
  name: string;
  description: string;
  systemKey: string;
  createdAt: string;
  updatedAt: string;
}>;

export type CreateCampaignInput = Readonly<{
  name: string;
  description?: string;
  systemKey?: string;
}>;

export type CampaignFactoryDependencies = Readonly<{
  createId: () => string;
  now: () => Date;
}>;

const defaultDependencies: CampaignFactoryDependencies = {
  createId: () => crypto.randomUUID(),
  now: () => new Date(),
};

export function createCampaign(
  input: CreateCampaignInput,
  dependencies: CampaignFactoryDependencies = defaultDependencies,
): Campaign {
  const name = input.name.trim();
  const systemKey = input.systemKey?.trim() || DEFAULT_CAMPAIGN_SYSTEM_KEY;

  if (!name) {
    throw new Error('Campaign name is required.');
  }

  const now = dependencies.now().toISOString();

  return {
    id: dependencies.createId(),
    name,
    description: input.description?.trim() ?? '',
    systemKey,
    createdAt: now,
    updatedAt: now,
  };
}
