import { TestBed } from '@angular/core/testing';

import { ApplicationBackupService } from '@app/features/backups/application/application-backup.service';
import { ApplicationBackupGateway } from '@app/features/backups/data-access/application-backup.gateway';
import { ApplicationWindowGateway } from '@app/features/backups/data-access/application-window.gateway';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { TechnicalLogService } from '@app/features/diagnostics/application/technical-log.service';

describe('ApplicationBackupService', () => {
  const log = { reportError: vi.fn() };
  const gateway = {
    isAvailable: true,
    selectBackupDestination: vi.fn(),
    selectBackupArchive: vi.fn(),
    createBackup: vi.fn(),
    createAutomaticBackup: vi.fn(),
    getBackupStatus: vi.fn(),
    checkDatabase: vi.fn(),
    latestAutomaticBackup: vi.fn(),
    inspectBackup: vi.fn(),
    prepareRestore: vi.fn(),
    takeRestoreResult: vi.fn(),
  };
  let closeCallback: (() => void) | null;
  const unlisten = vi.fn();
  const applicationWindow = {
    isPrimaryWindow: true,
    listenForCloseRequest: vi.fn((callback: () => void) => {
      closeCallback = callback;
      return Promise.resolve(unlisten);
    }),
    close: vi.fn(),
  };
  const toast = { success: vi.fn(), warning: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    closeCallback = null;
    gateway.takeRestoreResult.mockResolvedValue(null);
    gateway.checkDatabase.mockResolvedValue(undefined);
    gateway.latestAutomaticBackup.mockResolvedValue(null);
    gateway.getBackupStatus.mockResolvedValue({ hasChanges: false, fingerprint: 'current' });
    gateway.createAutomaticBackup.mockResolvedValue({
      archivePath: 'C:\\AppData\\backups\\automatic\\auto.zip',
      manifest: { formatVersion: 1, appVersion: '0.1.0', createdAtUnixMs: 1 },
    });
    applicationWindow.close.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        ApplicationBackupService,
        { provide: ApplicationBackupGateway, useValue: gateway },
        { provide: ApplicationWindowGateway, useValue: applicationWindow },
        { provide: ToastService, useValue: toast },
        { provide: TechnicalLogService, useValue: log },
      ],
    });
  });

  it('announces a successful restoration after restart', async () => {
    gateway.takeRestoreResult.mockResolvedValue({
      success: true,
      message: 'Restauration terminée.',
    });

    await TestBed.inject(ApplicationBackupService).announceRestoreResult();

    expect(toast.success).toHaveBeenCalledWith('Restauration terminée.');
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('warns the GM when startup kept the previous data after a restore failure', async () => {
    gateway.takeRestoreResult.mockResolvedValue({
      success: false,
      message: 'Les données précédentes ont été conservées.',
    });

    await TestBed.inject(ApplicationBackupService).announceRestoreResult();

    expect(toast.warning).toHaveBeenCalledWith('Les données précédentes ont été conservées.');
  });

  it('does not block startup when the restore receipt is unreadable', async () => {
    gateway.takeRestoreResult.mockRejectedValue(new Error('invalid receipt'));

    await expect(
      TestBed.inject(ApplicationBackupService).announceRestoreResult(),
    ).resolves.toBeUndefined();
    expect(toast.warning).toHaveBeenCalledWith(
      'Le résultat de la restauration n’a pas pu être lu. Vérifie les données avant de jouer.',
    );
  });

  it('offers the latest automatic backup when SQLite cannot be opened', async () => {
    gateway.checkDatabase.mockRejectedValue(new Error('database disk image is malformed'));
    gateway.latestAutomaticBackup.mockResolvedValue({
      archivePath: 'C:\\AppData\\backups\\automatic\\auto.zip',
      manifest: { formatVersion: 1, appVersion: '0.1.0', createdAtUnixMs: 1 },
    });
    const service = TestBed.inject(ApplicationBackupService);

    await service.initialize();

    expect(service.recovery()).toMatchObject({
      reason: 'database disk image is malformed',
      candidate: { archivePath: 'C:\\AppData\\backups\\automatic\\auto.zip' },
    });
    expect(applicationWindow.listenForCloseRequest).not.toHaveBeenCalled();
  });

  it('logs a failed manual backup before returning the error to the view', async () => {
    const error = new Error('archive denied');
    gateway.createBackup.mockRejectedValue(error);

    await expect(
      TestBed.inject(ApplicationBackupService).createBackup('D:\\backup.zip', () => undefined),
    ).rejects.toBe(error);

    expect(log.reportError).toHaveBeenCalledWith('backup.manual', error);
  });

  it('closes directly when the current data is already backed up', async () => {
    const service = TestBed.inject(ApplicationBackupService);
    await service.initialize();

    closeCallback?.();
    await vi.waitFor(() => expect(applicationWindow.close).toHaveBeenCalledOnce());

    expect(service.closePrompt()).toBeNull();
    expect(unlisten).toHaveBeenCalledOnce();
  });

  it('asks before closing when the current data has changed', async () => {
    gateway.getBackupStatus.mockResolvedValue({ hasChanges: true, fingerprint: 'changed' });
    const service = TestBed.inject(ApplicationBackupService);
    await service.initialize();

    closeCallback?.();
    await vi.waitFor(() => expect(service.closePrompt()).not.toBeNull());

    expect(applicationWindow.close).not.toHaveBeenCalled();
  });

  it('creates an automatic backup before closing after confirmation', async () => {
    gateway.getBackupStatus.mockResolvedValue({ hasChanges: true, fingerprint: 'changed' });
    const service = TestBed.inject(ApplicationBackupService);
    await service.initialize();
    closeCallback?.();
    await vi.waitFor(() => expect(service.closePrompt()).not.toBeNull());

    await service.saveAndClose();

    expect(gateway.createAutomaticBackup).toHaveBeenCalledOnce();
    expect(applicationWindow.close).toHaveBeenCalledOnce();
  });

  it('keeps the close flow available when the native exit command fails', async () => {
    applicationWindow.close.mockRejectedValue(new Error('exit denied'));
    const service = TestBed.inject(ApplicationBackupService);
    await service.initialize();

    closeCallback?.();
    await vi.waitFor(() =>
      expect(service.closePrompt()?.error).toBe('Impossible de fermer l’application : exit denied'),
    );

    expect(applicationWindow.listenForCloseRequest).toHaveBeenCalledTimes(2);
  });
});
