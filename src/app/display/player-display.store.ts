import { Injectable, signal } from '@angular/core';

import { initialPlayerDisplayState, type PlayerDisplayState } from './player-display-state';

@Injectable({ providedIn: 'root' })
export class PlayerDisplayStore {
  private readonly stateSignal = signal<PlayerDisplayState>(initialPlayerDisplayState);

  readonly state = this.stateSignal.asReadonly();

  setState(state: PlayerDisplayState): void {
    this.stateSignal.set(state);
  }

  showBlank(): void {
    this.setState({ mode: 'blank' });
  }
}
