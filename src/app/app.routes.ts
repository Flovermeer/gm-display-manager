import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'control',
    loadComponent: () => import('./control/control').then(({ Control }) => Control),
    title: "Beholder's Inn — Panneau MJ",
  },
  {
    path: 'player-display',
    loadComponent: () =>
      import('./player-display/player-display').then(({ PlayerDisplay }) => PlayerDisplay),
    title: "Beholder's Inn — Écran joueurs",
  },
  { path: '', pathMatch: 'full', redirectTo: 'control' },
  { path: '**', redirectTo: 'control' },
];
