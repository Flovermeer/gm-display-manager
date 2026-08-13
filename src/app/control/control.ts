import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { UnlistenFn } from '@tauri-apps/api/event';

import { CampaignContext } from '../campaign-layout/campaign-context';
import { DisplayGateway } from '../display/display.gateway';
import type { MonitorDescriptor } from '../display/display.models';
import { PlayerDisplayPreferenceService } from '../display/player-display-preference.service';
import type { PlayerDisplayState } from '../display/player-display-state';
import { PlayerDisplayStore } from '../display/player-display.store';

@Component({
  selector: 'app-control',
  imports: [RouterLink],
  templateUrl: './control.html',
  styleUrl: './control.scss',
})
export class Control implements OnInit, OnDestroy {
  private readonly campaignContext = inject(CampaignContext);
  private readonly displayGateway = inject(DisplayGateway);
  private readonly playerDisplayPreference = inject(PlayerDisplayPreferenceService);
  private readonly playerDisplayStore = inject(PlayerDisplayStore);
  private unlistenPlayerDisplayReady?: UnlistenFn;

  protected readonly isDesktop = this.displayGateway.isDesktop;
  protected readonly campaign = this.campaignContext.campaign;
  protected readonly monitors = signal<readonly MonitorDescriptor[]>([]);
  protected readonly selectedMonitorId = signal('');
  protected readonly isLoading = signal(false);
  protected readonly isPlayerDisplayOpen = signal(false);
  protected readonly playerDisplayMonitorId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedMonitor = computed(() =>
    this.monitors().find((monitor) => monitor.id === this.selectedMonitorId()),
  );
  protected readonly displayState = this.playerDisplayStore.state;
  protected readonly isSelectedPlayerMonitor = computed(
    () =>
      this.selectedMonitorId() !== '' && this.selectedMonitorId() === this.playerDisplayMonitorId(),
  );

  ngOnInit(): void {
    void this.initializeCampaign();
  }

  ngOnDestroy(): void {
    this.unlistenPlayerDisplayReady?.();
  }

  protected async refreshMonitors(): Promise<void> {
    await this.runDisplayAction(async () => {
      const monitors = await this.displayGateway.listMonitors();
      const selectedMonitorId = this.selectedMonitorId();

      this.monitors.set(monitors);
      if (!monitors.some((monitor) => monitor.id === selectedMonitorId)) {
        const preferredMonitor = await this.playerDisplayPreference.findPreferredMonitor(monitors);
        this.selectedMonitorId.set(preferredMonitor?.id ?? '');
      }
      const isPlayerDisplayOpen = await this.displayGateway.isPlayerDisplayOpen();
      this.isPlayerDisplayOpen.set(isPlayerDisplayOpen);
      this.playerDisplayMonitorId.set(
        isPlayerDisplayOpen ? await this.displayGateway.getPlayerDisplayMonitorId() : null,
      );
    });
  }

  protected selectMonitor(event: Event): void {
    this.selectedMonitorId.set((event.target as HTMLSelectElement).value);
  }

  protected async openPlayerDisplay(): Promise<void> {
    const monitor = this.selectedMonitor();
    if (!monitor) {
      return;
    }

    await this.runDisplayAction(async () => {
      await this.displayGateway.openPlayerDisplay(monitor.id);
      this.isPlayerDisplayOpen.set(true);
      this.playerDisplayMonitorId.set(monitor.id);
      await this.playerDisplayPreference.savePreferredMonitor(monitor);
    });
  }

  protected async closePlayerDisplay(): Promise<void> {
    await this.runDisplayAction(async () => {
      await this.displayGateway.closePlayerDisplay();
      this.isPlayerDisplayOpen.set(false);
      this.playerDisplayMonitorId.set(null);
    });
  }

  protected showLocation(): void {
    void this.publishDisplayState({
      mode: 'location',
      locationId: 'demo-tavern',
      imagePath: '/demo/tavern.svg',
      name: "Beholder's Inn",
    });
  }

  protected showNpc(): void {
    void this.publishDisplayState({
      mode: 'npc',
      npcId: 'demo-innkeeper',
      name: 'Mira Vell',
      portraitPath: '/demo/innkeeper.svg',
      backgroundPath: '/demo/tavern.svg',
    });
  }

  protected showBlank(): void {
    void this.publishDisplayState({ mode: 'blank' });
  }

  protected displayStateLabel(state: PlayerDisplayState): string {
    switch (state.mode) {
      case 'blank':
        return 'Écran noir';
      case 'location':
        return state.name ?? 'Lieu';
      case 'npc':
        return state.name;
      case 'document':
        return state.name ?? 'Document';
    }
  }

  protected monitorLabel(monitor: MonitorDescriptor): string {
    const primary = monitor.isPrimary ? ' — principal' : '';
    return `${monitor.name} — ${monitor.width} × ${monitor.height}${primary}`;
  }

  private async runDisplayAction(action: () => Promise<void>): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await action();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async initializeDesktop(): Promise<void> {
    try {
      this.unlistenPlayerDisplayReady = await this.displayGateway.listenForPlayerDisplayReady(
        () => {
          void this.displayGateway.sendPlayerDisplayState(this.playerDisplayStore.state());
        },
      );
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }

    await this.refreshMonitors();
  }

  private async initializeCampaign(): Promise<void> {
    try {
      if (!(await this.campaignContext.load())) return;
      if (this.isDesktop) {
        await this.initializeDesktop();
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  private async publishDisplayState(state: PlayerDisplayState): Promise<void> {
    this.playerDisplayStore.setState(state);

    if (!this.isDesktop || !this.isPlayerDisplayOpen()) {
      return;
    }

    await this.runDisplayAction(() => this.displayGateway.sendPlayerDisplayState(state));
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Une erreur native inattendue est survenue.';
  }
}
