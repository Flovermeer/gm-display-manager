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
    path: 'campaigns/:campaignId',
    loadComponent: () =>
      import('./campaign-layout/campaign-layout').then(({ CampaignLayout }) => CampaignLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./control/control').then(({ Control }) => Control),
        title: "Beholder's Inn — Panneau MJ",
      },
      {
        path: 'chapters',
        loadComponent: () =>
          import('./chapter-workspace/chapter-workspace').then(
            ({ ChapterWorkspace }) => ChapterWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — Chapitres",
      },
      {
        path: 'locations',
        loadComponent: () =>
          import('./location-workspace/location-workspace').then(
            ({ LocationWorkspace }) => LocationWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — Lieux",
      },
      {
        path: 'npcs',
        loadComponent: () =>
          import('./npc-workspace/npc-workspace').then(({ NpcWorkspace }) => NpcWorkspace),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — PNJ",
      },
      {
        path: 'player-characters',
        loadComponent: () =>
          import('./player-character-workspace/player-character-workspace').then(
            ({ PlayerCharacterWorkspace }) => PlayerCharacterWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — PJ",
      },
      {
        path: 'journal',
        loadComponent: () =>
          import('./journal-workspace/journal-workspace').then(
            ({ JournalWorkspace }) => JournalWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — Journal",
      },
      {
        path: 'configuration',
        loadComponent: () =>
          import('./campaign-configuration-workspace/campaign-configuration-workspace').then(
            ({ CampaignConfigurationWorkspace }) => CampaignConfigurationWorkspace,
          ),
        title: "Beholder's Inn — Configuration",
      },
    ],
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
