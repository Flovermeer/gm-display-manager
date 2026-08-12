import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DisplayGateway } from '../display/display.gateway';
import type { MonitorDescriptor } from '../display/display.models';

@Component({
  selector: 'app-control',
  imports: [RouterLink],
  templateUrl: './control.html',
  styleUrl: './control.scss',
})
export class Control implements OnInit {
  private readonly displayGateway = inject(DisplayGateway);

  protected readonly isDesktop = this.displayGateway.isDesktop;
  protected readonly monitors = signal<readonly MonitorDescriptor[]>([]);
  protected readonly selectedMonitorId = signal('');
  protected readonly isLoading = signal(false);
  protected readonly isPlayerDisplayOpen = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedMonitor = computed(() =>
    this.monitors().find((monitor) => monitor.id === this.selectedMonitorId()),
  );

  ngOnInit(): void {
    if (this.isDesktop) {
      void this.refreshMonitors();
    }
  }

  protected async refreshMonitors(): Promise<void> {
    await this.runDisplayAction(async () => {
      const monitors = await this.displayGateway.listMonitors();
      const selectedMonitorId = this.selectedMonitorId();

      this.monitors.set(monitors);
      if (!monitors.some((monitor) => monitor.id === selectedMonitorId)) {
        this.selectedMonitorId.set('');
      }
      this.isPlayerDisplayOpen.set(await this.displayGateway.isPlayerDisplayOpen());
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
    });
  }

  protected async closePlayerDisplay(): Promise<void> {
    await this.runDisplayAction(async () => {
      await this.displayGateway.closePlayerDisplay();
      this.isPlayerDisplayOpen.set(false);
    });
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

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Une erreur native inattendue est survenue.';
  }
}
