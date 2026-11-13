export type PlayerDisplayState =
  | Readonly<{ mode: 'neutral' }>
  | Readonly<{ mode: 'blank' }>
  | Readonly<{
      mode: 'scene';
      sceneId: string | null;
      sceneName?: string;
      background: PlayerDisplayBackground;
      foreground?: PlayerDisplayForeground;
    }>
  | Readonly<{
      mode: 'location';
      locationId: string;
      imagePath: string;
      name?: string;
    }>
  | Readonly<{
      mode: 'npc';
      npcId: string;
      name: string;
      portraitPath: string;
      idleVideoPath?: string;
      backgroundPath?: string;
    }>
  | Readonly<{
      mode: 'document';
      mediaId: string;
      filePath: string;
      name?: string;
    }>
  | Readonly<{
      mode: 'item';
      itemId: string;
      imagePath: string;
      name: string;
      summary?: string;
    }>
  | Readonly<{
      mode: 'monster';
      monsterId: string;
      imagePath: string;
      name: string;
    }>;

export type PlayerDisplayBackground =
  Readonly<{ type: 'default' }> | Readonly<{ type: 'image'; imagePath: string; name?: string }>;

export type PlayerDisplayForeground =
  | Readonly<{
      type: 'npc';
      resourceId: string;
      name: string;
      imagePath: string;
      idleVideoPath?: string;
    }>
  | Readonly<{
      type: 'item';
      resourceId: string;
      name: string;
      imagePath: string;
      summary?: string;
    }>;

export type PlayerDisplayStateOf<Mode extends PlayerDisplayState['mode']> = Extract<
  PlayerDisplayState,
  { mode: Mode }
>;

export const initialPlayerDisplayState: PlayerDisplayState = { mode: 'neutral' };

export function isDisplayingResource(
  state: PlayerDisplayState,
  resourceType: string,
  resourceId: string,
): boolean {
  switch (resourceType) {
    case 'npc':
      return state.mode === 'npc' && state.npcId === resourceId;
    case 'monster':
      return state.mode === 'monster' && state.monsterId === resourceId;
    case 'location':
      return state.mode === 'location' && state.locationId === resourceId;
    case 'item':
      return state.mode === 'item' && state.itemId === resourceId;
    case 'scene':
      return state.mode === 'scene' && state.sceneId === resourceId;
    default:
      return false;
  }
}
