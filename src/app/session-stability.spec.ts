import { TestBed } from '@angular/core/testing';

import { ApplicationBackupService } from '@app/features/backups/application/application-backup.service';
import { ApplicationBackupGateway } from '@app/features/backups/data-access/application-backup.gateway';
import { ApplicationWindowGateway } from '@app/features/backups/data-access/application-window.gateway';
import { TechnicalLogService } from '@app/features/diagnostics/application/technical-log.service';
import { PlayerDisplayMonitorSessionService } from '@app/features/display/application/player-display-monitor-session.service';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import type { MonitorDescriptor } from '@app/features/display/domain/display.models';
import { ToastService } from '@app/shared/ui/toast/toast.service';

describe('Long session stability', () => {
  const sessionDuration = 4 * 60 * 60 * 1_000;
  const monitorCheckInterval = 2_000;
  const automaticBackupInterval = 30 * 60 * 1_000;
  const monitor: MonitorDescriptor = {
    id: 'player-screen|1920x1200|1.25|-1920,0',
    fingerprint: 'player-screen|1920x1200|1.25',
    name: 'Player screen',
    width: 1920,
    height: 1200,
    x: -1920,
    y: 0,
    scaleFactor: 1.25,
    isPrimary: false,
  };
  const relocatedMonitor: MonitorDescriptor = {
    ...monitor,
    id: 'player-screen|1920x1200|1.25|0,0',
    x: 0,
  };
  const backupGateway = {
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
  const applicationWindow = {
    isPrimaryWindow: true,
    listenForCloseRequest: vi.fn(),
    close: vi.fn(),
  };
  const displayGateway = {
    isDesktop: true,
    isPlayerDisplayOpen: vi.fn(),
    listMonitors: vi.fn(),
    getPlayerDisplayMonitorId: vi.fn(),
    closePlayerDisplay: vi.fn(),
  };
  const toast = { success: vi.fn(), warning: vi.fn() };
  const log = { reportError: vi.fn() };
  let currentMonitor = monitor;
  let monitorListCount = 0;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    currentMonitor = monitor;
    monitorListCount = 0;

    backupGateway.takeRestoreResult.mockResolvedValue(null);
    backupGateway.checkDatabase.mockResolvedValue(undefined);
    backupGateway.getBackupStatus.mockResolvedValue({
      hasChanges: true,
      fingerprint: 'changed',
    });
    backupGateway.createAutomaticBackup.mockImplementation(() =>
      Promise.resolve({
        archivePath: `C:\\AppData\\backups\\automatic\\${Date.now()}.zip`,
        manifest: { formatVersion: 1, appVersion: '0.1.0', createdAtUnixMs: Date.now() },
      }),
    );
    applicationWindow.listenForCloseRequest.mockResolvedValue(vi.fn());
    applicationWindow.close.mockResolvedValue(undefined);

    displayGateway.isPlayerDisplayOpen.mockResolvedValue(true);
    displayGateway.listMonitors.mockImplementation(() => {
      currentMonitor = monitorListCount++ % 2 === 0 ? monitor : relocatedMonitor;
      return Promise.resolve([currentMonitor]);
    });
    displayGateway.getPlayerDisplayMonitorId.mockImplementation(() =>
      Promise.resolve(currentMonitor.id),
    );
    displayGateway.closePlayerDisplay.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        ApplicationBackupService,
        PlayerDisplayMonitorSessionService,
        { provide: ApplicationBackupGateway, useValue: backupGateway },
        { provide: ApplicationWindowGateway, useValue: applicationWindow },
        { provide: DisplayGateway, useValue: displayGateway },
        { provide: ToastService, useValue: toast },
        { provide: TechnicalLogService, useValue: log },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(PlayerDisplayMonitorSessionService).stop();
    vi.useRealTimers();
  });

  it('keeps monitoring and automatic backups healthy for four virtual hours', async () => {
    const backup = TestBed.inject(ApplicationBackupService);
    const displaySession = TestBed.inject(PlayerDisplayMonitorSessionService);
    await Promise.all([backup.initialize(), displaySession.start()]);

    await vi.advanceTimersByTimeAsync(sessionDuration);

    expect(backupGateway.createAutomaticBackup).toHaveBeenCalledTimes(
      sessionDuration / automaticBackupInterval,
    );
    expect(displayGateway.listMonitors).toHaveBeenCalledTimes(
      sessionDuration / monitorCheckInterval + 1,
    );
    expect(displayGateway.closePlayerDisplay).not.toHaveBeenCalled();
    expect(applicationWindow.close).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
    expect(log.reportError).not.toHaveBeenCalled();

    await backup.quitWithoutBackup();
  });
});
