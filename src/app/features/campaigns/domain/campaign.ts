export type Campaign = Readonly<{
  id: string;
  name: string;
  description: string;
  universeId: string;
  createdAt: string;
  updatedAt: string;
}>;

export type CreateCampaignInput = Readonly<{
  name: string;
  description?: string;
  universeId: string;
}>;

export type UpdateCampaignInput = Readonly<{
  name: string;
  description: string;
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
  const universeId = input.universeId.trim();

  if (!name) {
    throw new Error('Campaign name is required.');
  }
  if (!universeId) {
    throw new Error('Campaign universe is required.');
  }

  const now = dependencies.now().toISOString();

  return {
    id: dependencies.createId(),
    name,
    description: input.description?.trim() ?? '',
    universeId,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateCampaign(
  campaign: Campaign,
  input: UpdateCampaignInput,
  now: () => Date = () => new Date(),
): Campaign {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Campaign name is required.');
  }

  return {
    ...campaign,
    name,
    description: input.description.trim(),
    updatedAt: now().toISOString(),
  };
}
