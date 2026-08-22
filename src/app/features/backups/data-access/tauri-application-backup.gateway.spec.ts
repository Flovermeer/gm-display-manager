import { invoke } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { open, save } from '@tauri-apps/plugin-dialog';
import Database from '@tauri-apps/plugin-sql';

import { TauriApplicationBackupGateway } from '@app/features/backups/data-access/tauri-application-backup.gateway';
import type { BackupManifest } from '@app/features/backups/domain/backup.models';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/path', () => ({ appDataDir: vi.fn(), join: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

describe('TauriApplicationBackupGateway', () => {
  const manifest: BackupManifest = {
    formatVersion: 1,
    appVersion: '0.1.0',
    createdAtUnixMs: 1_787_300_000_000,
  };
  const database = { execute: vi.fn(), select: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000000');
    vi.mocked(appDataDir).mockResolvedValue('C:\\AppData\\BeholdersInn');
    vi.mocked(join).mockImplementation((...parts) => Promise.resolve(parts.join('\\')));
    vi.mocked(Database.load).mockResolvedValue(database as never);
    database.execute.mockResolvedValue({ rowsAffected: 0, lastInsertId: 0 });
    database.select.mockResolvedValue([{ quick_check: 'ok' }]);
    vi.mocked(invoke).mockImplementation((command) => {
      if (command === 'create_backup' || command === 'inspect_backup') {
        return Promise.resolve(manifest as never);
      }
      return Promise.resolve(undefined as never);
    });
  });

  it('creates a consistent SQLite snapshot before invoking the native archiver', async () => {
    const stages: string[] = [];

    await expect(
      new TauriApplicationBackupGateway().createBackup('D:\\Backups\\session.zip', (stage) =>
        stages.push(stage),
      ),
    ).resolves.toEqual(manifest);

    const snapshotPath =
      'C:\\AppData\\BeholdersInn\\.backup-snapshot-00000000-0000-4000-8000-000000000000.db';
    expect(database.execute).toHaveBeenCalledWith('VACUUM INTO $1', [snapshotPath]);
    expect(invoke).toHaveBeenCalledWith('create_backup', {
      snapshotPath,
      archivePath: 'D:\\Backups\\session.zip',
    });
    expect(invoke).toHaveBeenLastCalledWith('cleanup_backup_snapshot', { snapshotPath });
    expect(stages).toEqual(['database', 'archive']);
  });

  it('creates an automatic archive through the same consistent snapshot flow', async () => {
    const candidate = {
      archivePath: 'C:\\AppData\\BeholdersInn\\backups\\automatic\\auto.zip',
      manifest,
    };
    vi.mocked(invoke).mockImplementation((command) => {
      if (command === 'create_automatic_backup') return Promise.resolve(candidate as never);
      return Promise.resolve(undefined as never);
    });

    await expect(
      new TauriApplicationBackupGateway().createAutomaticBackup(() => {}),
    ).resolves.toEqual(candidate);

    expect(invoke).toHaveBeenCalledWith('create_automatic_backup', {
      snapshotPath:
        'C:\\AppData\\BeholdersInn\\.backup-snapshot-00000000-0000-4000-8000-000000000000.db',
    });
  });

  it('cleans up a partial snapshot when SQLite fails', async () => {
    database.execute.mockRejectedValue(new Error('database is locked'));

    await expect(
      new TauriApplicationBackupGateway().createBackup('D:\\Backups\\session.zip', () => {}),
    ).rejects.toThrow('database is locked');

    expect(invoke).toHaveBeenCalledWith('cleanup_backup_snapshot', {
      snapshotPath:
        'C:\\AppData\\BeholdersInn\\.backup-snapshot-00000000-0000-4000-8000-000000000000.db',
    });
    expect(invoke).not.toHaveBeenCalledWith('create_backup', expect.anything());
  });

  it('selects and validates one ZIP archive before restoration', async () => {
    vi.mocked(open).mockResolvedValue('D:\\Backups\\session.zip');
    const gateway = new TauriApplicationBackupGateway();

    await expect(gateway.selectBackupArchive()).resolves.toBe('D:\\Backups\\session.zip');
    await expect(gateway.inspectBackup('D:\\Backups\\session.zip')).resolves.toEqual(manifest);
    expect(invoke).toHaveBeenCalledWith('inspect_backup', {
      archivePath: 'D:\\Backups\\session.zip',
    });
  });

  it('opens the save dialog with a portable ZIP format', async () => {
    vi.mocked(save).mockResolvedValue('D:\\Backups\\session.zip');

    await expect(new TauriApplicationBackupGateway().selectBackupDestination()).resolves.toBe(
      'D:\\Backups\\session.zip',
    );
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ name: "Sauvegarde Beholder's Inn", extensions: ['zip'] }],
      }),
    );
  });

  it('adds the ZIP extension when Windows does not append the selected filter', async () => {
    vi.mocked(save).mockResolvedValue('D:\\Backups\\session');

    await expect(new TauriApplicationBackupGateway().selectBackupDestination()).resolves.toBe(
      'D:\\Backups\\session.zip',
    );
  });

  it('checks SQLite integrity before normal startup', async () => {
    await expect(new TauriApplicationBackupGateway().checkDatabase()).resolves.toBeUndefined();
    expect(database.select).toHaveBeenCalledWith('PRAGMA quick_check');
  });

  it('rejects a failed SQLite integrity check', async () => {
    database.select.mockResolvedValue([{ quick_check: 'database disk image is malformed' }]);

    await expect(new TauriApplicationBackupGateway().checkDatabase()).rejects.toThrow(
      'contrôle d’intégrité',
    );
  });
});
