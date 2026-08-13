export type PlayerDisplayState =
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
    }>;

export type PlayerDisplayBackground =
  | Readonly<{ type: 'default' }>
  | Readonly<{ type: 'image'; imagePath: string; name?: string }>;

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

export const initialPlayerDisplayState: PlayerDisplayState = { mode: 'blank' };
