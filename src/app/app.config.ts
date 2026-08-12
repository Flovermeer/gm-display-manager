import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { CampaignRepository } from './campaign/campaign.repository';
import { routes } from './app.routes';
import { AppSettingRepository } from './persistence/app-setting.repository';
import { TauriAppSettingRepository } from './persistence/tauri-app-setting.repository';
import { TauriCampaignRepository } from './persistence/tauri-campaign.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: AppSettingRepository, useClass: TauriAppSettingRepository },
    { provide: CampaignRepository, useClass: TauriCampaignRepository },
  ],
};
