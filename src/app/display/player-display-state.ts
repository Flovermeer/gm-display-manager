export type PlayerDisplayState =
  | Readonly<{ mode: 'blank' }>
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

export const initialPlayerDisplayState: PlayerDisplayState = { mode: 'blank' };
