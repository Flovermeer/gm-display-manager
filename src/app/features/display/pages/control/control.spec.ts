import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { UnlistenFn } from '@tauri-apps/api/event';

import { AppSettingRepository } from '@app/core/persistence/app-setting.repository';
import { InMemoryAppSettingRepository } from '@app/core/persistence/in-memory-app-setting.repository';
import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { PlayerDisplayPreferenceService } from '@app/features/display/application/player-display-preference.service';
import { PlayerDisplayStore } from '@app/features/display/application/player-display.store';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import type { MonitorDescriptor } from '@app/features/display/domain/display.models';
import { Control } from '@app/features/display/pages/control/control';
import { SceneDisplayService } from '@app/features/scenes/application/scene-display.service';
import { PlayerDisplayMonitorSessionService } from '@app/features/display/application/player-display-monitor-session.service';
import { TechnicalLogService } from '@app/features/diagnostics/application/technical-log.service';

describe('Control', () => {
  const monitor: MonitorDescriptor = {
    id: 'monitor-id',
    fingerprint: 'monitor-fingerprint',
    name: 'Player screen',
    width: 1920,
    height: 1080,
    x: 1920,
    y: 0,
    scaleFactor: 1,
    isPrimary: false,
  };
  const campaign = {
    id: 'campaign-id',
    name: 'Tomb of Annihilation',
    description: '',
    universeId: 'universe-id',
    createdAt: '2026-08-21T08:00:00.000Z',
    updatedAt: '2026-08-21T08:00:00.000Z',
  };
  let notifyPlayerDisplayClosed: (() => void) | undefined;
  const unlistenClosed = vi.fn<UnlistenFn>();
  const displayGateway = {
    isDesktop: true,
    listMonitors: vi.fn(),
    isPlayerDisplayOpen: vi.fn(),
    getPlayerDisplayMonitorId: vi.fn(),
    openPlayerDisplay: vi.fn(),
    closePlayerDisplay: vi.fn(),
    listenForPlayerDisplayReady: vi.fn(),
    listenForPlayerDisplayClosed: vi.fn(),
    sendPlayerDisplayState: vi.fn(),
  };
  const preferenceService = {
    findPreferredMonitor: vi.fn(),
    savePreferredMonitor: vi.fn(),
  };
  const sceneDisplayService = { restore: vi.fn() };
  const playerDisplayMonitorSession = { track: vi.fn(), clear: vi.fn() };
  const log = { reportError: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    notifyPlayerDisplayClosed = undefined;
    displayGateway.listMonitors.mockResolvedValue([monitor]);
    displayGateway.isPlayerDisplayOpen.mockResolvedValue(true);
    displayGateway.getPlayerDisplayMonitorId.mockResolvedValue(monitor.id);
    displayGateway.openPlayerDisplay.mockResolvedValue(undefined);
    displayGateway.closePlayerDisplay.mockResolvedValue(undefined);
    displayGateway.listenForPlayerDisplayReady.mockResolvedValue(vi.fn());
    displayGateway.listenForPlayerDisplayClosed.mockImplementation(
      (callback: () => void): Promise<UnlistenFn> => {
        notifyPlayerDisplayClosed = callback;
        return Promise.resolve(unlistenClosed);
      },
    );
    displayGateway.sendPlayerDisplayState.mockResolvedValue(undefined);
    preferenceService.findPreferredMonitor.mockResolvedValue(monitor);
    preferenceService.savePreferredMonitor.mockResolvedValue(undefined);
    sceneDisplayService.restore.mockResolvedValue({ mode: 'blank' });

    await TestBed.configureTestingModule({
      imports: [Control],
      providers: [
        provideRouter([]),
        PlayerDisplayStore,
        {
          provide: CampaignContext,
          useValue: { campaign: () => campaign, load: () => Promise.resolve(campaign) },
        },
        { provide: DisplayGateway, useValue: displayGateway },
        { provide: AppSettingRepository, useClass: InMemoryAppSettingRepository },
        { provide: PlayerDisplayPreferenceService, useValue: preferenceService },
        { provide: SceneDisplayService, useValue: sceneDisplayService },
        {
          provide: PlayerDisplayMonitorSessionService,
          useValue: playerDisplayMonitorSession,
        },
        { provide: TechnicalLogService, useValue: log },
      ],
    }).compileComponents();
  });

  it('detects a native close and can reopen the player display', async () => {
    const fixture = TestBed.createComponent(Control);
    fixture.detectChanges();
    await renderUntil(fixture, 'Déjà affiché sur cet écran');

    notifyPlayerDisplayClosed?.();
    fixture.detectChanges();

    const openButton = findButton(fixture, "Ouvrir l'écran joueurs");
    expect(openButton.disabled).toBe(false);
    openButton.click();

    await vi.waitFor(() => {
      expect(displayGateway.openPlayerDisplay).toHaveBeenCalledWith(monitor.id);
      expect(displayGateway.listenForPlayerDisplayClosed).toHaveBeenCalledTimes(2);
    });
    expect(preferenceService.savePreferredMonitor).toHaveBeenCalledWith(monitor);
    expect(playerDisplayMonitorSession.track).toHaveBeenLastCalledWith(monitor);
  });

  it('refreshes a relocated monitor before reopening the player display', async () => {
    const fixture = TestBed.createComponent(Control);
    fixture.detectChanges();
    await renderUntil(fixture, 'Déjà affiché sur cet écran');
    notifyPlayerDisplayClosed?.();
    fixture.detectChanges();

    const relocated = { ...monitor, id: 'monitor-fingerprint|-1920,0', x: -1920 };
    displayGateway.listMonitors.mockResolvedValue([relocated]);
    findButton(fixture, "Ouvrir l'écran joueurs").click();

    await vi.waitFor(() =>
      expect(displayGateway.openPlayerDisplay).toHaveBeenCalledWith(relocated.id),
    );
    expect(preferenceService.savePreferredMonitor).toHaveBeenCalledWith(relocated);
    expect(playerDisplayMonitorSession.track).toHaveBeenLastCalledWith(relocated);
  });
});

function findButton(fixture: ComponentFixture<Control>, label: string): HTMLButtonElement {
  const element = fixture.nativeElement as HTMLElement;
  const button = [...element.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(label),
  );
  if (!button) throw new Error(`Button not found: ${label}`);
  return button;
}

async function renderUntil(fixture: ComponentFixture<Control>, text: string): Promise<void> {
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(text);
  });
}
