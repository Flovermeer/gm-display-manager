/**
 * But
 * Conserve l’état courant envoyé à l’écran des joueurs.
 *
 * Responsabilités
 * - offre une source réactive commune aux fenêtres Angular ;
 * - centralise les transitions vers le fond neutre ;
 */

import { Injectable, signal } from '@angular/core';

import {
  initialPlayerDisplayState,
  type PlayerDisplayState,
} from '@app/features/display/domain/player-display-state';

@Injectable({ providedIn: 'root' })
export class PlayerDisplayStore {
  private readonly stateSignal = signal<PlayerDisplayState>(initialPlayerDisplayState);

  readonly state = this.stateSignal.asReadonly();

  setState(state: PlayerDisplayState): void {
    this.stateSignal.set(state);
  }

  showNeutral(): void {
    this.setState({ mode: 'neutral' });
  }
}
