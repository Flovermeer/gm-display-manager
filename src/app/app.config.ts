import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { isTauri } from '@tauri-apps/api/core';

import { CampaignRepository } from '@app/features/campaigns/data-access/campaign.repository';
import { ChapterRepository } from '@app/features/chapters/data-access/chapter.repository';
import { JournalEntryRepository } from '@app/features/journal/data-access/journal-entry.repository';
import { BrowserCampaignMediaGateway } from '@app/features/campaigns/data-access/browser-campaign-media.gateway';
import { LocationRepository } from '@app/features/locations/data-access/location.repository';
import { BrowserNpcPortraitGateway } from '@app/features/npcs/data-access/browser-npc-portrait.gateway';
import { BrowserPlayerCharacterPortraitGateway } from '@app/features/players/data-access/browser-player-character-portrait.gateway';
import { BrowserNpcIdleVideoGateway } from '@app/features/npcs/data-access/browser-npc-idle-video.gateway';
import { BrowserLocationImageGateway } from '@app/features/locations/data-access/browser-location-image.gateway';
import { BrowserItemImageGateway } from '@app/features/items/data-access/browser-item-image.gateway';
import { CampaignMediaGateway } from '@app/features/campaigns/data-access/campaign-media.gateway';
import { LocationImageGateway } from '@app/features/locations/data-access/location-image.gateway';
import { ItemImageGateway } from '@app/features/items/data-access/item-image.gateway';
import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';
import { PlayerCharacterPortraitGateway } from '@app/features/players/data-access/player-character-portrait.gateway';
import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';
import { TauriLocationImageGateway } from '@app/features/locations/data-access/tauri-location-image.gateway';
import { TauriItemImageGateway } from '@app/features/items/data-access/tauri-item-image.gateway';
import { TauriCampaignMediaGateway } from '@app/features/campaigns/data-access/tauri-campaign-media.gateway';
import { TauriNpcPortraitGateway } from '@app/features/npcs/data-access/tauri-npc-portrait.gateway';
import { TauriPlayerCharacterPortraitGateway } from '@app/features/players/data-access/tauri-player-character-portrait.gateway';
import { TauriNpcIdleVideoGateway } from '@app/features/npcs/data-access/tauri-npc-idle-video.gateway';
import { NpcRepository } from '@app/features/npcs/data-access/npc.repository';
import { PlayerCharacterRepository } from '@app/features/players/data-access/player-character.repository';
import { ItemConfigurationRepository } from '@app/features/items/data-access/item-configuration.repository';
import { NarrativeItemRepository } from '@app/features/items/data-access/narrative-item.repository';
import { SceneRepository } from '@app/features/scenes/data-access/scene.repository';
import { routes } from '@app/app.routes';
import { AppSettingRepository } from '@app/core/persistence/app-setting.repository';
import { InMemoryAppSettingRepository } from '@app/core/persistence/in-memory-app-setting.repository';
import { InMemoryCampaignRepository } from '@app/features/campaigns/data-access/in-memory-campaign.repository';
import { InMemoryChapterRepository } from '@app/features/chapters/data-access/in-memory-chapter.repository';
import { InMemoryJournalEntryRepository } from '@app/features/journal/data-access/in-memory-journal-entry.repository';
import { InMemoryLocationRepository } from '@app/features/locations/data-access/in-memory-location.repository';
import { InMemoryNpcRepository } from '@app/features/npcs/data-access/in-memory-npc.repository';
import { InMemoryPlayerCharacterRepository } from '@app/features/players/data-access/in-memory-player-character.repository';
import { InMemoryItemConfigurationRepository } from '@app/features/items/data-access/in-memory-item-configuration.repository';
import { InMemoryNarrativeItemRepository } from '@app/features/items/data-access/in-memory-narrative-item.repository';
import { InMemorySceneRepository } from '@app/features/scenes/data-access/in-memory-scene.repository';
import { TauriAppSettingRepository } from '@app/core/persistence/tauri-app-setting.repository';
import { TauriCampaignRepository } from '@app/features/campaigns/data-access/tauri-campaign.repository';
import { TauriChapterRepository } from '@app/features/chapters/data-access/tauri-chapter.repository';
import { TauriJournalEntryRepository } from '@app/features/journal/data-access/tauri-journal-entry.repository';
import { TauriLocationRepository } from '@app/features/locations/data-access/tauri-location.repository';
import { TauriNpcRepository } from '@app/features/npcs/data-access/tauri-npc.repository';
import { TauriPlayerCharacterRepository } from '@app/features/players/data-access/tauri-player-character.repository';
import { TauriItemConfigurationRepository } from '@app/features/items/data-access/tauri-item-configuration.repository';
import { TauriNarrativeItemRepository } from '@app/features/items/data-access/tauri-narrative-item.repository';
import { TauriSceneRepository } from '@app/features/scenes/data-access/tauri-scene.repository';
import { GameSystemRepository } from '@app/features/game-systems/data-access/game-system.repository';
import { InMemoryGameSystemRepository } from '@app/features/game-systems/data-access/in-memory-game-system.repository';
import { TauriGameSystemRepository } from '@app/features/game-systems/data-access/tauri-game-system.repository';
import { MonsterRepository } from '@app/features/bestiary/data-access/monster.repository';
import { InMemoryMonsterRepository } from '@app/features/bestiary/data-access/in-memory-monster.repository';
import { TauriMonsterRepository } from '@app/features/bestiary/data-access/tauri-monster.repository';
import { MonsterImageGateway } from '@app/features/bestiary/data-access/monster-image.gateway';
import { BrowserMonsterImageGateway } from '@app/features/bestiary/data-access/browser-monster-image.gateway';
import { TauriMonsterImageGateway } from '@app/features/bestiary/data-access/tauri-monster-image.gateway';
import { GameRuleOptionRepository } from '@app/features/game-systems/data-access/game-rule-option.repository';
import { InMemoryGameRuleOptionRepository } from '@app/features/game-systems/data-access/in-memory-game-rule-option.repository';
import { TauriGameRuleOptionRepository } from '@app/features/game-systems/data-access/tauri-game-rule-option.repository';

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
      provide: GameSystemRepository,
      useFactory: () =>
        isTauri() ? new TauriGameSystemRepository() : new InMemoryGameSystemRepository(),
    },
    {
      provide: GameRuleOptionRepository,
      useFactory: () =>
        isTauri()
          ? new TauriGameRuleOptionRepository()
          : new InMemoryGameRuleOptionRepository(),
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
      provide: MonsterRepository,
      useFactory: () =>
        isTauri() ? new TauriMonsterRepository() : new InMemoryMonsterRepository(),
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
    {
      provide: MonsterImageGateway,
      useFactory: () =>
        isTauri() ? new TauriMonsterImageGateway() : new BrowserMonsterImageGateway(),
    },
  ],
};
