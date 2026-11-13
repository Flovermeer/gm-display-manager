/**
 * But
 * Publie le contenu destiné à l’écran des joueurs depuis toutes les pages du MJ.
 *
 * Responsabilités
 * - met à jour l’état partagé puis l’envoie à la fenêtre joueurs ;
 * - bascule une ressource entre affichage et fond neutre ;
 * - retire ou actualise la ressource affichée après une suppression ou une modification ;
 */

import { inject, Injectable } from '@angular/core';

import { PlayerDisplayStore } from '@app/features/display/application/player-display.store';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import type { PlayerDisplayState } from '@app/features/display/domain/player-display-state';
import { ActiveSceneService } from '@app/features/scenes/application/active-scene.service';

export type DisplayedStateMatcher = (state: PlayerDisplayState) => boolean;

@Injectable({ providedIn: 'root' })
export class PlayerDisplayPublisher {
  private readonly gateway = inject(DisplayGateway);
  private readonly store = inject(PlayerDisplayStore);
  private readonly activeScene = inject(ActiveSceneService);

  readonly state = this.store.state;

  async isOpen(): Promise<boolean> {
    return this.gateway.isDesktop && (await this.gateway.isPlayerDisplayOpen());
  }

  /** Remplace l’état partagé et l’envoie à la fenêtre joueurs. */
  async send(state: PlayerDisplayState): Promise<void> {
    this.store.setState(state);
    await this.gateway.sendPlayerDisplayState(state);
  }

  /** Remplace l’état partagé et ne l’envoie que si la fenêtre joueurs est ouverte. */
  async update(state: PlayerDisplayState, isWindowOpen: boolean): Promise<void> {
    this.store.setState(state);
    if (isWindowOpen) await this.gateway.sendPlayerDisplayState(state);
  }

  /** Affiche une ressource autonome, ou revient au fond neutre si elle est déjà affichée. */
  async toggle(
    campaignId: string,
    isDisplayed: DisplayedStateMatcher,
    build: () => Promise<PlayerDisplayState> | PlayerDisplayState,
  ): Promise<void> {
    await this.activeScene.clear(campaignId);
    if (isDisplayed(this.store.state())) {
      await this.send({ mode: 'neutral' });
      return;
    }
    await this.send(await build());
  }

  /** Revient au fond neutre si la ressource retirée est celle affichée aux joueurs. */
  async withdraw(isDisplayed: DisplayedStateMatcher, isWindowOpen: boolean): Promise<void> {
    if (!isDisplayed(this.store.state())) return;
    await this.update({ mode: 'neutral' }, isWindowOpen);
  }

  /** Actualise la ressource affichée aux joueurs après sa modification. */
  async refresh<State extends PlayerDisplayState>(
    isDisplayed: (state: PlayerDisplayState) => state is State,
    next: (current: State) => Promise<PlayerDisplayState> | PlayerDisplayState,
    isWindowOpen: boolean,
  ): Promise<void> {
    const current = this.store.state();
    if (!isDisplayed(current)) return;
    await this.update(await next(current), isWindowOpen);
  }
}
