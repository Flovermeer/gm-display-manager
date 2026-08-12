import { Injectable } from '@angular/core';
import { isTauri } from '@tauri-apps/api/core';
import { WebviewWindow, getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { availableMonitors, primaryMonitor, type Monitor } from '@tauri-apps/api/window';

import type { MonitorDescriptor } from './display.models';

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
    return [
      monitor.name ?? 'unknown',
      `${monitor.size.width}x${monitor.size.height}`,
      monitor.scaleFactor,
      `${monitor.position.x},${monitor.position.y}`,
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
