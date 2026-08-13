import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { isTauri } from '@tauri-apps/api/core';

import { CampaignRepository } from './campaign/campaign.repository';
import { ChapterRepository } from './chapter/chapter.repository';
import { JournalEntryRepository } from './journal/journal-entry.repository';
import { BrowserCampaignMediaGateway } from './media/browser-campaign-media.gateway';
import { LocationRepository } from './location/location.repository';
import { BrowserNpcPortraitGateway } from './media/browser-npc-portrait.gateway';
import { BrowserPlayerCharacterPortraitGateway } from './media/browser-player-character-portrait.gateway';
import { BrowserNpcIdleVideoGateway } from './media/browser-npc-idle-video.gateway';
import { BrowserLocationImageGateway } from './media/browser-location-image.gateway';
import { BrowserItemImageGateway } from './media/browser-item-image.gateway';
import { CampaignMediaGateway } from './media/campaign-media.gateway';
import { LocationImageGateway } from './media/location-image.gateway';
import { ItemImageGateway } from './media/item-image.gateway';
import { NpcPortraitGateway } from './media/npc-portrait.gateway';
import { PlayerCharacterPortraitGateway } from './media/player-character-portrait.gateway';
import { NpcIdleVideoGateway } from './media/npc-idle-video.gateway';
import { TauriLocationImageGateway } from './media/tauri-location-image.gateway';
import { TauriItemImageGateway } from './media/tauri-item-image.gateway';
import { TauriCampaignMediaGateway } from './media/tauri-campaign-media.gateway';
import { TauriNpcPortraitGateway } from './media/tauri-npc-portrait.gateway';
import { TauriPlayerCharacterPortraitGateway } from './media/tauri-player-character-portrait.gateway';
import { TauriNpcIdleVideoGateway } from './media/tauri-npc-idle-video.gateway';
import { NpcRepository } from './npc/npc.repository';
import { PlayerCharacterRepository } from './player-character/player-character.repository';
import { ItemConfigurationRepository } from './narrative-item/item-configuration.repository';
import { NarrativeItemRepository } from './narrative-item/narrative-item.repository';
import { SceneRepository } from './scene/scene.repository';
import { routes } from './app.routes';
import { AppSettingRepository } from './persistence/app-setting.repository';
import { InMemoryAppSettingRepository } from './persistence/in-memory-app-setting.repository';
import { InMemoryCampaignRepository } from './persistence/in-memory-campaign.repository';
import { InMemoryChapterRepository } from './persistence/in-memory-chapter.repository';
import { InMemoryJournalEntryRepository } from './persistence/in-memory-journal-entry.repository';
import { InMemoryLocationRepository } from './persistence/in-memory-location.repository';
import { InMemoryNpcRepository } from './persistence/in-memory-npc.repository';
import { InMemoryPlayerCharacterRepository } from './persistence/in-memory-player-character.repository';
import { InMemoryItemConfigurationRepository } from './persistence/in-memory-item-configuration.repository';
import { InMemoryNarrativeItemRepository } from './persistence/in-memory-narrative-item.repository';
import { InMemorySceneRepository } from './persistence/in-memory-scene.repository';
import { TauriAppSettingRepository } from './persistence/tauri-app-setting.repository';
import { TauriCampaignRepository } from './persistence/tauri-campaign.repository';
import { TauriChapterRepository } from './persistence/tauri-chapter.repository';
import { TauriJournalEntryRepository } from './persistence/tauri-journal-entry.repository';
import { TauriLocationRepository } from './persistence/tauri-location.repository';
import { TauriNpcRepository } from './persistence/tauri-npc.repository';
import { TauriPlayerCharacterRepository } from './persistence/tauri-player-character.repository';
import { TauriItemConfigurationRepository } from './persistence/tauri-item-configuration.repository';
import { TauriNarrativeItemRepository } from './persistence/tauri-narrative-item.repository';
import { TauriSceneRepository } from './persistence/tauri-scene.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    {
      provide: AppSettingRepository,
      useFactory: () =>
        isTauri() ? new TauriAppSettingRepository() : new InMemoryAppSettingRepository(),
    },
    {
      provide: CampaignRepository,
      useFactory: () =>
        isTauri() ? new TauriCampaignRepository() : new InMemoryCampaignRepository(),
    },
    {
      provide: ChapterRepository,
      useFactory: () =>
        isTauri() ? new TauriChapterRepository() : new InMemoryChapterRepository(),
    },
    {
      provide: JournalEntryRepository,
      useFactory: () =>
        isTauri() ? new TauriJournalEntryRepository() : new InMemoryJournalEntryRepository(),
    },
    {
      provide: CampaignMediaGateway,
      useFactory: () =>
        isTauri() ? new TauriCampaignMediaGateway() : new BrowserCampaignMediaGateway(),
    },
    {
      provide: LocationRepository,
      useFactory: () =>
        isTauri() ? new TauriLocationRepository() : new InMemoryLocationRepository(),
    },
    {
      provide: NpcRepository,
      useFactory: () => (isTauri() ? new TauriNpcRepository() : new InMemoryNpcRepository()),
    },
    {
      provide: PlayerCharacterRepository,
      useFactory: () =>
        isTauri() ? new TauriPlayerCharacterRepository() : new InMemoryPlayerCharacterRepository(),
    },
    {
      provide: ItemConfigurationRepository,
      useFactory: () =>
        isTauri()
          ? new TauriItemConfigurationRepository()
          : new InMemoryItemConfigurationRepository(),
    },
    {
      provide: NarrativeItemRepository,
      useFactory: () =>
        isTauri() ? new TauriNarrativeItemRepository() : new InMemoryNarrativeItemRepository(),
    },
    {
      provide: SceneRepository,
      useFactory: () => (isTauri() ? new TauriSceneRepository() : new InMemorySceneRepository()),
    },
    {
      provide: LocationImageGateway,
      useFactory: () =>
        isTauri() ? new TauriLocationImageGateway() : new BrowserLocationImageGateway(),
    },
    {
      provide: ItemImageGateway,
      useFactory: () => (isTauri() ? new TauriItemImageGateway() : new BrowserItemImageGateway()),
    },
    {
      provide: NpcIdleVideoGateway,
      useFactory: () =>
        isTauri() ? new TauriNpcIdleVideoGateway() : new BrowserNpcIdleVideoGateway(),
    },
    {
      provide: NpcPortraitGateway,
      useFactory: () =>
        isTauri() ? new TauriNpcPortraitGateway() : new BrowserNpcPortraitGateway(),
    },
    {
      provide: PlayerCharacterPortraitGateway,
      useFactory: () =>
        isTauri()
          ? new TauriPlayerCharacterPortraitGateway()
          : new BrowserPlayerCharacterPortraitGateway(),
    },
  ],
};
