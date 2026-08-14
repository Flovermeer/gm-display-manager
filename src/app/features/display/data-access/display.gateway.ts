/**
 * But
 * Isole toutes les opérations natives liées aux fenêtres et moniteurs.
 *
 * Responsabilités
 * - détecte les écrans via Tauri ;
 * - ouvre et positionne le Player Display ;
 * - synchronise son état entre les fenêtres ;
 * - empêche l’usage des API desktop dans le navigateur ;
 */

import { Injectable } from '@angular/core';
import { isTauri } from '@tauri-apps/api/core';
import { emitTo, listen, type UnlistenFn } from '@tauri-apps/api/event';
import { WebviewWindow, getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import {
  availableMonitors,
  monitorFromPoint,
  primaryMonitor,
  type Monitor,
} from '@tauri-apps/api/window';

import { playerDisplayEvents } from '@app/features/display/domain/display.events';
import type { MonitorDescriptor } from '@app/features/display/domain/display.models';
import type { PlayerDisplayState } from '@app/features/display/domain/player-display-state';

const PLAYER_DISPLAY_WINDOW_LABEL = 'player-display';

@Injectable({ providedIn: 'root' })
export class DisplayGateway {
  readonly isDesktop = isTauri();

  isPlayerDisplayWindow(): boolean {
    return this.isDesktop && getCurrentWebviewWindow().label === PLAYER_DISPLAY_WINDOW_LABEL;
  }

  async listMonitors(): Promise<readonly MonitorDescriptor[]> {
    this.assertDesktop();

    const [monitors, primary] = await Promise.all([availableMonitors(), primaryMonitor()]);

    return monitors.map((monitor) => this.toDescriptor(monitor, primary));
  }

  async isPlayerDisplayOpen(): Promise<boolean> {
    this.assertDesktop();
    return (await WebviewWindow.getByLabel(PLAYER_DISPLAY_WINDOW_LABEL)) !== null;
  }

  async getPlayerDisplayMonitorId(): Promise<string | null> {
    this.assertDesktop();
    const playerDisplay = await WebviewWindow.getByLabel(PLAYER_DISPLAY_WINDOW_LABEL);

    if (!playerDisplay) {
      return null;
    }

    const position = await playerDisplay.outerPosition();
    const monitor = await monitorFromPoint(position.x, position.y);
    return monitor ? this.monitorId(monitor) : null;
  }

  async openPlayerDisplay(monitorId: string): Promise<void> {
    this.assertDesktop();

    const monitors = await availableMonitors();
    const target = monitors.find((monitor) => this.monitorId(monitor) === monitorId);

    if (!target) {
      throw new Error(
        "Le moniteur sélectionné n'est plus disponible. Actualise la liste des écrans.",
      );
    }

    const existing = await WebviewWindow.getByLabel(PLAYER_DISPLAY_WINDOW_LABEL);

    if (existing) {
      const currentPosition = await existing.outerPosition();
      const currentMonitor = await monitorFromPoint(currentPosition.x, currentPosition.y);
      if (currentMonitor && this.monitorId(currentMonitor) === monitorId) {
        return;
      }

      await this.placeFullscreen(existing, target);
      return;
    }

    const position = target.position.toLogical(target.scaleFactor);
    const size = target.size.toLogical(target.scaleFactor);
    const playerDisplay = new WebviewWindow(PLAYER_DISPLAY_WINDOW_LABEL, {
      url: '/player-display',
      title: "Beholder's Inn — Écran joueurs",
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      decorations: false,
      resizable: false,
      focus: false,
      visible: false,
    });

    await this.waitForCreation(playerDisplay);
    await this.placeFullscreen(playerDisplay, target);
  }

  async closePlayerDisplay(): Promise<void> {
    this.assertDesktop();
    const playerDisplay = await WebviewWindow.getByLabel(PLAYER_DISPLAY_WINDOW_LABEL);
    await playerDisplay?.close();
  }

  listenForPlayerDisplayReady(callback: () => void): Promise<UnlistenFn> {
    this.assertDesktop();
    return listen<void>(playerDisplayEvents.ready, callback);
  }

  listenForPlayerDisplayState(callback: (state: PlayerDisplayState) => void): Promise<UnlistenFn> {
    this.assertDesktop();
    return listen<PlayerDisplayState>(playerDisplayEvents.stateChanged, ({ payload }) =>
      callback(payload),
    );
  }

  sendPlayerDisplayState(state: PlayerDisplayState): Promise<void> {
    this.assertDesktop();
    return emitTo(PLAYER_DISPLAY_WINDOW_LABEL, playerDisplayEvents.stateChanged, state);
  }

  announcePlayerDisplayReady(): Promise<void> {
    this.assertDesktop();
    return emitTo('main', playerDisplayEvents.ready);
  }

  private async placeFullscreen(window: WebviewWindow, monitor: Monitor): Promise<void> {
    await window.setFullscreen(false);
    await window.setPosition(monitor.position);
    await window.setSize(monitor.size);
    await window.setFullscreen(true);
    await window.show();
  }

  private waitForCreation(window: WebviewWindow): Promise<void> {
    return new Promise((resolve, reject) => {
      void window.once('tauri://created', () => resolve());
      void window.once<unknown>('tauri://error', ({ payload }) => {
        reject(new Error(this.errorMessage(payload)));
      });
    });
  }

  private toDescriptor(monitor: Monitor, primary: Monitor | null): MonitorDescriptor {
    return {
      id: this.monitorId(monitor),
      fingerprint: this.monitorFingerprint(monitor),
      name: monitor.name ?? 'Moniteur sans nom',
      width: monitor.size.width,
      height: monitor.size.height,
      x: monitor.position.x,
      y: monitor.position.y,
      scaleFactor: monitor.scaleFactor,
      isPrimary: primary !== null && this.monitorId(primary) === this.monitorId(monitor),
    };
  }

  private monitorId(monitor: Monitor): string {
    return [this.monitorFingerprint(monitor), `${monitor.position.x},${monitor.position.y}`].join(
      '|',
    );
  }

  private monitorFingerprint(monitor: Monitor): string {
    return [
      monitor.name ?? 'unknown',
      `${monitor.size.width}x${monitor.size.height}`,
      monitor.scaleFactor,
    ].join('|');
  }

  private assertDesktop(): void {
    if (!this.isDesktop) {
      throw new Error('La gestion des écrans est uniquement disponible dans Tauri.');
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return typeof error === 'string' ? error : String(error);
  }
}
