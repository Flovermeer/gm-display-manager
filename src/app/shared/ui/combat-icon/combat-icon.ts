import { Component } from '@angular/core';

/** Deux épées croisées, dessinées avec la couleur du texte du bouton parent. */
@Component({
  selector: 'app-combat-icon',
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="m13 19 6-6M16 16l4 4M19 21l2-2" />
      <path d="M14.5 6.5 18 3h3v3l-3.5 3.5" />
      <path d="m5 14 4 4M7 17l-3 3M3 19l2 2" />
    </svg>
  `,
  styles: `
    :host {
      display: contents;
    }

    svg {
      width: 1.15rem;
      height: 1.15rem;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }
  `,
})
export class CombatIcon {}
