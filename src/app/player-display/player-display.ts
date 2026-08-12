import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { UnlistenFn } from '@tauri-apps/api/event';

import { DisplayGateway } from '../display/display.gateway';
import { PlayerDisplayStore } from '../display/player-display.store';

@Component({
  selector: 'app-player-display',
  imports: [RouterLink],
  templateUrl: './player-display.html',
  styleUrl: './player-display.scss',
})
export class PlayerDisplay implements OnInit, OnDestroy {
  private readonly displayGateway = inject(DisplayGateway);
  private readonly playerDisplayStore = inject(PlayerDisplayStore);
  private unlistenPlayerDisplayState?: UnlistenFn;

  protected readonly isPreview = !this.displayGateway.isPlayerDisplayWindow();
  protected readonly state = this.playerDisplayStore.state;
  protected readonly videoFailed = signal(false);

  protected handleVideoError(): void {
    this.videoFailed.set(true);
  }

  ngOnInit(): void {
    if (!this.isPreview) {
      void this.initializePlayerDisplay();
    }
  }

  ngOnDestroy(): void {
    this.unlistenPlayerDisplayState?.();
  }

  private async initializePlayerDisplay(): Promise<void> {
    this.unlistenPlayerDisplayState = await this.displayGateway.listenForPlayerDisplayState(
      (state) => {
        this.videoFailed.set(false);
        this.playerDisplayStore.setState(state);
      },
    );
    await this.displayGateway.announcePlayerDisplayReady();
  }
}
