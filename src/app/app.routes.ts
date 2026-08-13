import { Routes } from '@angular/router';

import { pendingChangesGuard } from '@app/navigation/pending-changes.guard';

export const routes: Routes = [
  {
    path: 'campaigns',
    loadComponent: () =>
      import('@app/campaign-home/campaign-home').then(({ CampaignHome }) => CampaignHome),
    title: "Beholder's Inn — Campagnes",
  },
  {
    path: 'campaigns/:campaignId',
    loadComponent: () =>
      import('@app/campaign-layout/campaign-layout').then(({ CampaignLayout }) => CampaignLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('@app/control/control').then(({ Control }) => Control),
        title: "Beholder's Inn — Panneau MJ",
      },
      {
        path: 'scenes',
        loadComponent: () =>
          import('@app/scene-workspace/scene-workspace').then(({ SceneWorkspace }) => SceneWorkspace),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — Scènes",
      },
      {
        path: 'chapters',
        loadComponent: () =>
          import('@app/chapter-workspace/chapter-workspace').then(
            ({ ChapterWorkspace }) => ChapterWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — Chapitres",
      },
      {
        path: 'locations',
        loadComponent: () =>
          import('@app/location-workspace/location-workspace').then(
            ({ LocationWorkspace }) => LocationWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — Lieux",
      },
      {
        path: 'npcs',
        loadComponent: () =>
          import('@app/npc-workspace/npc-workspace').then(({ NpcWorkspace }) => NpcWorkspace),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — PNJ",
      },
      {
        path: 'player-characters',
        loadComponent: () =>
          import('@app/player-character-workspace/player-character-workspace').then(
            ({ PlayerCharacterWorkspace }) => PlayerCharacterWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — PJ",
      },
      {
        path: 'items',
        loadComponent: () =>
          import('@app/narrative-item-workspace/narrative-item-workspace').then(
            ({ NarrativeItemWorkspace }) => NarrativeItemWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — Objets",
      },
      {
        path: 'journal',
        loadComponent: () =>
          import('@app/journal-workspace/journal-workspace').then(
            ({ JournalWorkspace }) => JournalWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — Journal",
      },
      {
        path: 'configuration',
        loadComponent: () =>
          import('@app/campaign-configuration-workspace/campaign-configuration-workspace').then(
            ({ CampaignConfigurationWorkspace }) => CampaignConfigurationWorkspace,
          ),
        title: "Beholder's Inn — Configuration",
      },
    ],
  },
  {
    path: 'player-display',
    loadComponent: () =>
      import('@app/player-display/player-display').then(({ PlayerDisplay }) => PlayerDisplay),
    title: "Beholder's Inn — Écran joueurs",
  },
  { path: 'control', pathMatch: 'full', redirectTo: 'campaigns' },
  { path: '', pathMatch: 'full', redirectTo: 'campaigns' },
  { path: '**', redirectTo: 'campaigns' },
];
