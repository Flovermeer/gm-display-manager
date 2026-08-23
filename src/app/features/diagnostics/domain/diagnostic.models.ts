export type MediaKind =
  | 'npc-portrait'
  | 'npc-idle-video'
  | 'player-character-portrait'
  | 'location-image'
  | 'item-image'
  | 'monster-image';

export type MediaReference = Readonly<{
  kind: MediaKind;
  resourceId: string;
  resourceName: string;
  relativePath: string;
}>;

export type MediaIssue = MediaReference &
  Readonly<{
    reason: 'missing' | 'inaccessible';
  }>;

export type MediaDiagnosticResult = Readonly<{
  checkedAt: string;
  checkedCount: number;
  issues: readonly MediaIssue[];
}>;
