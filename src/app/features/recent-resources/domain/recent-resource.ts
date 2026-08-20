export const RECENT_RESOURCE_LIMIT = 8;

export type RecentResourceType =
  'player-character' | 'npc' | 'monster' | 'location' | 'chapter' | 'item' | 'scene';

export type RecentResource = Readonly<{
  campaignId: string;
  resourceType: RecentResourceType;
  resourceId: string;
  displayName: string;
  viewedOrder: number;
}>;

export type RecentResourceTarget = Readonly<{
  resourceType: RecentResourceType;
  resourceId: string;
  displayName: string;
}>;

export function recentResourceSegment(resourceType: RecentResourceType): string {
  return {
    'player-character': 'player-characters',
    npc: 'npcs',
    monster: 'bestiary',
    location: 'locations',
    chapter: 'chapters',
    item: 'items',
    scene: 'scenes',
  }[resourceType];
}

export function recentResourceTypeLabel(resourceType: RecentResourceType): string {
  return {
    'player-character': 'PJ',
    npc: 'PNJ',
    monster: 'Monstre',
    location: 'Lieu',
    chapter: 'Chapitre',
    item: 'Objet',
    scene: 'Scène',
  }[resourceType];
}
