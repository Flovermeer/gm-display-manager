export const UNIVERSE_RESOURCE_TYPES = [
  'npc',
  'player-character',
  'location',
  'item',
  'monster',
] as const;

export type UniverseResourceType = (typeof UNIVERSE_RESOURCE_TYPES)[number];

export type UniverseResourceSummary = Readonly<{
  id: string;
  universeId: string;
  type: UniverseResourceType;
  name: string;
  summary: string;
  campaignCount: number;
  deletedAt: string | null;
}>;
