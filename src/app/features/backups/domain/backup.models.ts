export type BackupManifest = Readonly<{
  formatVersion: number;
  appVersion: string;
  createdAtUnixMs: number;
}>;

export type RestoreResult = Readonly<{
  success: boolean;
  message: string;
}>;

export type BackupStatus = Readonly<{
  hasChanges: boolean;
  fingerprint: string;
}>;

export type BackupCandidate = Readonly<{
  archivePath: string;
  manifest: BackupManifest;
}>;

export type BackupProgressStage = 'database' | 'archive';
export type RestoreProgressStage = 'staging';
