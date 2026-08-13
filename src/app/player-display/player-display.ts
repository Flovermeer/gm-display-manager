import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { UnlistenFn } from '@tauri-apps/api/event';

import { DisplayGateway } from '../display/display.gateway';
import { PlayerDisplayStore } from '../display/player-display.store';
import type { PlayerDisplayState } from '../display/player-display-state';

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
  protected readonly state = signal<PlayerDisplayState>(this.playerDisplayStore.state());
  protected readonly contentVisible = signal(true);
  protected readonly foregroundVisible = signal(true);
  protected readonly videoFailed = signal(false);
  private transitionToken = 0;

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
        void this.transitionTo(state);
      },
    );
    await this.displayGateway.announcePlayerDisplayReady();
  }

  private async transitionTo(next: PlayerDisplayState): Promise<void> {
    const token = ++this.transitionToken;
    const current = this.state();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const foregroundOnly =
      current.mode === 'scene' &&
      next.mode === 'scene' &&
      current.sceneId === next.sceneId &&
      JSON.stringify(current.background) === JSON.stringify(next.background);
    if (reduceMotion) {
      this.state.set(next);
      return;
    }
    if (foregroundOnly) this.foregroundVisible.set(false);
    else this.contentVisible.set(false);
    await wait(300);
    if (token !== this.transitionToken) return;
    this.state.set(next);
    this.videoFailed.set(false);
    await nextFrame();
    if (token !== this.transitionToken) return;
    this.contentVisible.set(true);
    this.foregroundVisible.set(true);
  }
}

function wait(duration: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
