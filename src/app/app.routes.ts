import { Routes } from '@angular/router';

import { pendingChangesGuard } from '@app/core/navigation/pending-changes.guard';

export const routes: Routes = [
  {
    path: 'configuration',
    loadComponent: () =>
      import('@app/features/game-systems/pages/global-configuration/global-configuration').then(
        ({ GlobalConfiguration }) => GlobalConfiguration,
      ),
    title: "Beholder's Inn — Configuration",
  },
  {
    path: 'campaigns',
    loadComponent: () =>
      import('@app/features/campaigns/pages/campaign-home/campaign-home').then(
        ({ CampaignHome }) => CampaignHome,
      ),
    title: "Beholder's Inn — Campagnes",
  },
  {
    path: 'campaigns/:campaignId',
    loadComponent: () =>
      import('@app/features/campaigns/pages/campaign-layout/campaign-layout').then(
        ({ CampaignLayout }) => CampaignLayout,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('@app/features/display/pages/control/control').then(({ Control }) => Control),
        title: "Beholder's Inn — Panneau MJ",
      },
      {
        path: 'scenes',
        loadComponent: () =>
          import('@app/features/scenes/pages/scene-workspace/scene-workspace').then(
            ({ SceneWorkspace }) => SceneWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — Scènes",
      },
      {
        path: 'chapters',
        loadComponent: () =>
          import('@app/features/chapters/pages/chapter-workspace/chapter-workspace').then(
            ({ ChapterWorkspace }) => ChapterWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — Chapitres",
      },
      {
        path: 'locations',
        loadComponent: () =>
          import('@app/features/locations/pages/location-workspace/location-workspace').then(
            ({ LocationWorkspace }) => LocationWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — Lieux",
      },
      {
        path: 'npcs',
        loadComponent: () =>
          import('@app/features/npcs/pages/npc-workspace/npc-workspace').then(
            ({ NpcWorkspace }) => NpcWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — PNJ",
      },
      {
        path: 'bestiary',
        loadComponent: () =>
          import('@app/features/bestiary/pages/bestiary-workspace/bestiary-workspace').then(
            ({ BestiaryWorkspace }) => BestiaryWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — Bestiaire",
      },
      {
        path: 'player-characters',
        loadComponent: () =>
          import('@app/features/players/pages/player-character-workspace/player-character-workspace').then(
            ({ PlayerCharacterWorkspace }) => PlayerCharacterWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — PJ",
      },
      {
        path: 'items',
        loadComponent: () =>
          import('@app/features/items/pages/narrative-item-workspace/narrative-item-workspace').then(
            ({ NarrativeItemWorkspace }) => NarrativeItemWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — Objets",
      },
      {
        path: 'journal',
        loadComponent: () =>
          import('@app/features/journal/pages/journal-workspace/journal-workspace').then(
            ({ JournalWorkspace }) => JournalWorkspace,
          ),
        canDeactivate: [pendingChangesGuard],
        title: "Beholder's Inn — Journal",
      },
      {
        path: 'configuration',
        loadComponent: () =>
          import('@app/features/campaigns/pages/campaign-configuration/campaign-configuration-workspace').then(
            ({ CampaignConfigurationWorkspace }) => CampaignConfigurationWorkspace,
          ),
        title: "Beholder's Inn — Configuration",
      },
    ],
  },
  {
    path: 'player-display',
    loadComponent: () =>
      import('@app/features/display/pages/player-display/player-display').then(
        ({ PlayerDisplay }) => PlayerDisplay,
      ),
    title: "Beholder's Inn — Écran joueurs",
  },
  { path: 'control', pathMatch: 'full', redirectTo: 'campaigns' },
  { path: '', pathMatch: 'full', redirectTo: 'campaigns' },
  { path: '**', redirectTo: 'campaigns' },
];
