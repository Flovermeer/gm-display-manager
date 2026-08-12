import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { isTauri } from '@tauri-apps/api/core';

import { CampaignRepository } from './campaign/campaign.repository';
import { BrowserNpcPortraitGateway } from './media/browser-npc-portrait.gateway';
import { NpcPortraitGateway } from './media/npc-portrait.gateway';
import { TauriNpcPortraitGateway } from './media/tauri-npc-portrait.gateway';
import { NpcRepository } from './npc/npc.repository';
import { routes } from './app.routes';
import { AppSettingRepository } from './persistence/app-setting.repository';
import { InMemoryAppSettingRepository } from './persistence/in-memory-app-setting.repository';
import { InMemoryCampaignRepository } from './persistence/in-memory-campaign.repository';
import { InMemoryNpcRepository } from './persistence/in-memory-npc.repository';
import { TauriAppSettingRepository } from './persistence/tauri-app-setting.repository';
import { TauriCampaignRepository } from './persistence/tauri-campaign.repository';
import { TauriNpcRepository } from './persistence/tauri-npc.repository';

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
      provide: NpcRepository,
      useFactory: () => (isTauri() ? new TauriNpcRepository() : new InMemoryNpcRepository()),
    },
    {
      provide: NpcPortraitGateway,
      useFactory: () =>
        isTauri() ? new TauriNpcPortraitGateway() : new BrowserNpcPortraitGateway(),
    },
  ],
};
