import { TestBed } from '@angular/core/testing';

import { PlayerDisplayMonitorSessionService } from '@app/features/display/application/player-display-monitor-session.service';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import type { MonitorDescriptor } from '@app/features/display/domain/display.models';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { TechnicalLogService } from '@app/features/diagnostics/application/technical-log.service';

describe('PlayerDisplayMonitorSessionService', () => {
  const monitor: MonitorDescriptor = {
    id: 'screen|1920x1080|1|1920,0',
    fingerprint: 'screen|1920x1080|1',
    name: 'Player screen',
    width: 1920,
    height: 1080,
    x: 1920,
    y: 0,
    scaleFactor: 1,
    isPrimary: false,
  };
  const gateway = {
    isDesktop: true,
    isPlayerDisplayOpen: vi.fn(),
    listMonitors: vi.fn(),
    getPlayerDisplayMonitorId: vi.fn(),
    closePlayerDisplay: vi.fn(),
  };
  const toast = { warning: vi.fn() };
  const log = { reportError: vi.fn() };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    gateway.isPlayerDisplayOpen.mockResolvedValue(true);
    gateway.listMonitors.mockResolvedValue([monitor]);
    gateway.getPlayerDisplayMonitorId.mockResolvedValue(monitor.id);
    gateway.closePlayerDisplay.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        PlayerDisplayMonitorSessionService,
        { provide: DisplayGateway, useValue: gateway },
        { provide: ToastService, useValue: toast },
        { provide: TechnicalLogService, useValue: log },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(PlayerDisplayMonitorSessionService).stop();
    vi.useRealTimers();
  });

  it('closes the Player Display and warns the GM when its monitor disappears', async () => {
    const service = TestBed.inject(PlayerDisplayMonitorSessionService);
    await service.start();
    gateway.listMonitors.mockResolvedValue([]);

    await vi.advanceTimersByTimeAsync(2_000);

    expect(gateway.closePlayerDisplay).toHaveBeenCalledOnce();
    expect(toast.warning).toHaveBeenCalledWith(
      "Le moniteur de l'écran joueurs n'est plus disponible. Le Player Display a été fermé.",
    );
  });

  it('keeps the window open when the same unique monitor only changes coordinates', async () => {
    const relocated = { ...monitor, id: 'screen|1920x1080|1|-1920,0', x: -1920 };
    const service = TestBed.inject(PlayerDisplayMonitorSessionService);
    await service.start();
    gateway.listMonitors.mockResolvedValue([relocated]);
    gateway.getPlayerDisplayMonitorId.mockResolvedValue(relocated.id);

    await vi.advanceTimersByTimeAsync(2_000);

    expect(gateway.closePlayerDisplay).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('stops monitoring silently when the Player Display is closed normally', async () => {
    const service = TestBed.inject(PlayerDisplayMonitorSessionService);
    await service.start();
    gateway.isPlayerDisplayOpen.mockResolvedValue(false);

    await vi.advanceTimersByTimeAsync(2_000);

    expect(gateway.closePlayerDisplay).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });
});
