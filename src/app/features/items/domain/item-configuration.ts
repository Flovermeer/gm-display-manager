export type ItemConfigurationKind = 'type' | 'rarity';

export type ItemConfigurationOption = Readonly<{
  id: string;
  campaignId: string;
  kind: ItemConfigurationKind;
  name: string;
  createdAt: string;
  updatedAt: string;
}>;

export function createItemConfigurationOption(
  campaignId: string,
  kind: ItemConfigurationKind,
  name: string,
  createId: () => string = () => crypto.randomUUID(),
  now: () => Date = () => new Date(),
): ItemConfigurationOption {
  const normalizedName = requiredName(name);
  const timestamp = now().toISOString();
  return {
    id: createId(),
    campaignId,
    kind,
    name: normalizedName,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function renameItemConfigurationOption(
  option: ItemConfigurationOption,
  name: string,
  now: () => Date = () => new Date(),
): ItemConfigurationOption {
  return { ...option, name: requiredName(name), updatedAt: now().toISOString() };
}

function requiredName(value: string): string {
  const name = value.trim();
  if (!name) throw new Error('Item configuration name is required.');
  return name;
}
