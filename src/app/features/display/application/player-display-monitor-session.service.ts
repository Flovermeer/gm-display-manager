/**
 * But
 * Surveille le moniteur réellement utilisé par le Player Display pendant une campagne.
 *
 * Responsabilités
 * - suit l'écran choisi tant que la fenêtre joueurs est ouverte ;
 * - accepte un changement de coordonnées lorsque le fingerprint reste unique ;
 * - ferme la fenêtre sans repli automatique lorsque l'écran disparaît ou devient ambigu ;
 * - prévient le MJ avec une notification temporaire.
 */

import { inject, Injectable, OnDestroy } from '@angular/core';

import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import type { MonitorDescriptor } from '@app/features/display/domain/display.models';
import { ToastService } from '@app/shared/ui/toast/toast.service';

const MONITOR_CHECK_INTERVAL = 2_000;

@Injectable()
export class PlayerDisplayMonitorSessionService implements OnDestroy {
  private readonly displayGateway = inject(DisplayGateway);
  private readonly toast = inject(ToastService);
  private monitoredDisplay: MonitorDescriptor | null = null;
  private intervalId: number | undefined;
  private isChecking = false;
  private isStarted = false;

  async start(): Promise<void> {
    if (this.isStarted || !this.displayGateway.isDesktop) return;
    this.isStarted = true;
    await this.discoverOpenDisplay();
  }

  stop(): void {
    this.isStarted = false;
    this.clear();
  }

  track(monitor: MonitorDescriptor): void {
    if (!this.displayGateway.isDesktop) return;
    this.monitoredDisplay = monitor;
    this.startPolling();
  }

  clear(): void {
    this.monitoredDisplay = null;
    if (this.intervalId !== undefined) window.clearInterval(this.intervalId);
    this.intervalId = undefined;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private async discoverOpenDisplay(): Promise<void> {
    try {
      if (!(await this.displayGateway.isPlayerDisplayOpen())) return;
      const [monitors, monitorId] = await Promise.all([
        this.displayGateway.listMonitors(),
        this.displayGateway.getPlayerDisplayMonitorId(),
      ]);
      const monitor = monitors.find(({ id }) => id === monitorId);
      if (monitor) this.track(monitor);
    } catch (error) {
      console.error('Unable to initialize Player Display monitor tracking.', error);
    }
  }

  private startPolling(): void {
    if (!this.isStarted || this.intervalId !== undefined) return;
    this.intervalId = window.setInterval(() => void this.check(), MONITOR_CHECK_INTERVAL);
  }

  private async check(): Promise<void> {
    if (this.isChecking || !this.monitoredDisplay) return;
    this.isChecking = true;
    try {
      const monitors = await this.displayGateway.listMonitors();
      const expected = this.monitoredDisplay;
      const exactMatch = monitors.find(({ id }) => id === expected.id);

      if (!exactMatch) {
        const open = await this.displayGateway.isPlayerDisplayOpen();
        const currentMonitorId = open
          ? await this.displayGateway.getPlayerDisplayMonitorId()
          : null;
        const fingerprintMatches = monitors.filter(
          ({ fingerprint }) => fingerprint === expected.fingerprint,
        );
        const relocated = fingerprintMatches.length === 1 ? fingerprintMatches[0] : null;

        if (relocated && relocated.id === currentMonitorId) {
          this.monitoredDisplay = relocated;
          return;
        }

        await this.handleMissingMonitor(open);
        return;
      }

      if (!(await this.displayGateway.isPlayerDisplayOpen())) {
        this.clear();
        return;
      }

      const currentMonitorId = await this.displayGateway.getPlayerDisplayMonitorId();
      const currentMonitor = monitors.find(({ id }) => id === currentMonitorId);
      if (currentMonitor && currentMonitor.id !== expected.id)
        this.monitoredDisplay = currentMonitor;
    } catch (error) {
      console.error('Unable to verify the Player Display monitor.', error);
    } finally {
      this.isChecking = false;
    }
  }

  private async handleMissingMonitor(isOpen: boolean): Promise<void> {
    if (isOpen) {
      try {
        await this.displayGateway.closePlayerDisplay();
      } catch (error) {
        console.error('Unable to close the Player Display after monitor loss.', error);
      }
    }
    this.clear();
    this.toast.warning(
      "Le moniteur de l'écran joueurs n'est plus disponible. Le Player Display a été fermé.",
    );
  }
}
