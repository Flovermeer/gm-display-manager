import { Routes } from '@angular/router';

import { pendingChangesGuard } from './navigation/pending-changes.guard';

export const routes: Routes = [
  {
    path: 'campaigns',
    loadComponent: () =>
      import('./campaign-home/campaign-home').then(({ CampaignHome }) => CampaignHome),
    title: "Beholder's Inn — Campagnes",
  },
  {
    path: 'campaigns/:campaignId/npcs',
    loadComponent: () =>
      import('./npc-workspace/npc-workspace').then(({ NpcWorkspace }) => NpcWorkspace),
    canDeactivate: [pendingChangesGuard],
    title: "Beholder's Inn — PNJ",
  },
  {
    path: 'campaigns/:campaignId',
    loadComponent: () => import('./control/control').then(({ Control }) => Control),
    title: "Beholder's Inn — Panneau MJ",
  },
  {
    path: 'player-display',
    loadComponent: () =>
      import('./player-display/player-display').then(({ PlayerDisplay }) => PlayerDisplay),
    title: "Beholder's Inn — Écran joueurs",
  },
  { path: 'control', pathMatch: 'full', redirectTo: 'campaigns' },
  { path: '', pathMatch: 'full', redirectTo: 'campaigns' },
  { path: '**', redirectTo: 'campaigns' },
];
