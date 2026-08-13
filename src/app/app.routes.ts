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
    path: 'campaigns/:campaignId/chapters',
    loadComponent: () =>
      import('./chapter-workspace/chapter-workspace').then(
        ({ ChapterWorkspace }) => ChapterWorkspace,
      ),
    canDeactivate: [pendingChangesGuard],
    title: "Beholder's Inn — Chapitres",
  },
  {
    path: 'campaigns/:campaignId/locations',
    loadComponent: () =>
      import('./location-workspace/location-workspace').then(
        ({ LocationWorkspace }) => LocationWorkspace,
      ),
    canDeactivate: [pendingChangesGuard],
    title: "Beholder's Inn — Lieux",
  },
  {
    path: 'campaigns/:campaignId/npcs',
    loadComponent: () =>
      import('./npc-workspace/npc-workspace').then(({ NpcWorkspace }) => NpcWorkspace),
    canDeactivate: [pendingChangesGuard],
    title: "Beholder's Inn — PNJ",
  },
  {
    path: 'campaigns/:campaignId/player-characters',
    loadComponent: () =>
      import('./player-character-workspace/player-character-workspace').then(
        ({ PlayerCharacterWorkspace }) => PlayerCharacterWorkspace,
      ),
    canDeactivate: [pendingChangesGuard],
    title: "Beholder's Inn — PJ",
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
  {
    path: 'editor-prototype',
    loadComponent: () =>
      import('./rich-text-editor-demo/rich-text-editor-demo').then(
        ({ RichTextEditorDemo }) => RichTextEditorDemo,
      ),
    title: "Beholder's Inn — Prototype de notes riches",
  },
  { path: 'control', pathMatch: 'full', redirectTo: 'campaigns' },
  { path: '', pathMatch: 'full', redirectTo: 'campaigns' },
  { path: '**', redirectTo: 'campaigns' },
];
