import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { isTauri } from '@tauri-apps/api/core';

import { CampaignRepository } from '@app/campaign/campaign.repository';
import { ChapterRepository } from '@app/chapter/chapter.repository';
import { JournalEntryRepository } from '@app/journal/journal-entry.repository';
import { BrowserCampaignMediaGateway } from '@app/media/browser-campaign-media.gateway';
import { LocationRepository } from '@app/location/location.repository';
import { BrowserNpcPortraitGateway } from '@app/media/browser-npc-portrait.gateway';
import { BrowserPlayerCharacterPortraitGateway } from '@app/media/browser-player-character-portrait.gateway';
import { BrowserNpcIdleVideoGateway } from '@app/media/browser-npc-idle-video.gateway';
import { BrowserLocationImageGateway } from '@app/media/browser-location-image.gateway';
import { BrowserItemImageGateway } from '@app/media/browser-item-image.gateway';
import { CampaignMediaGateway } from '@app/media/campaign-media.gateway';
import { LocationImageGateway } from '@app/media/location-image.gateway';
import { ItemImageGateway } from '@app/media/item-image.gateway';
import { NpcPortraitGateway } from '@app/media/npc-portrait.gateway';
import { PlayerCharacterPortraitGateway } from '@app/media/player-character-portrait.gateway';
import { NpcIdleVideoGateway } from '@app/media/npc-idle-video.gateway';
import { TauriLocationImageGateway } from '@app/media/tauri-location-image.gateway';
import { TauriItemImageGateway } from '@app/media/tauri-item-image.gateway';
import { TauriCampaignMediaGateway } from '@app/media/tauri-campaign-media.gateway';
import { TauriNpcPortraitGateway } from '@app/media/tauri-npc-portrait.gateway';
import { TauriPlayerCharacterPortraitGateway } from '@app/media/tauri-player-character-portrait.gateway';
import { TauriNpcIdleVideoGateway } from '@app/media/tauri-npc-idle-video.gateway';
import { NpcRepository } from '@app/npc/npc.repository';
import { PlayerCharacterRepository } from '@app/player-character/player-character.repository';
import { ItemConfigurationRepository } from '@app/narrative-item/item-configuration.repository';
import { NarrativeItemRepository } from '@app/narrative-item/narrative-item.repository';
import { SceneRepository } from '@app/scene/scene.repository';
import { routes } from '@app/app.routes';
import { AppSettingRepository } from '@app/persistence/app-setting.repository';
import { InMemoryAppSettingRepository } from '@app/persistence/in-memory-app-setting.repository';
import { InMemoryCampaignRepository } from '@app/persistence/in-memory-campaign.repository';
import { InMemoryChapterRepository } from '@app/persistence/in-memory-chapter.repository';
import { InMemoryJournalEntryRepository } from '@app/persistence/in-memory-journal-entry.repository';
import { InMemoryLocationRepository } from '@app/persistence/in-memory-location.repository';
import { InMemoryNpcRepository } from '@app/persistence/in-memory-npc.repository';
import { InMemoryPlayerCharacterRepository } from '@app/persistence/in-memory-player-character.repository';
import { InMemoryItemConfigurationRepository } from '@app/persistence/in-memory-item-configuration.repository';
import { InMemoryNarrativeItemRepository } from '@app/persistence/in-memory-narrative-item.repository';
import { InMemorySceneRepository } from '@app/persistence/in-memory-scene.repository';
import { TauriAppSettingRepository } from '@app/persistence/tauri-app-setting.repository';
import { TauriCampaignRepository } from '@app/persistence/tauri-campaign.repository';
import { TauriChapterRepository } from '@app/persistence/tauri-chapter.repository';
import { TauriJournalEntryRepository } from '@app/persistence/tauri-journal-entry.repository';
import { TauriLocationRepository } from '@app/persistence/tauri-location.repository';
import { TauriNpcRepository } from '@app/persistence/tauri-npc.repository';
import { TauriPlayerCharacterRepository } from '@app/persistence/tauri-player-character.repository';
import { TauriItemConfigurationRepository } from '@app/persistence/tauri-item-configuration.repository';
import { TauriNarrativeItemRepository } from '@app/persistence/tauri-narrative-item.repository';
import { TauriSceneRepository } from '@app/persistence/tauri-scene.repository';

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
