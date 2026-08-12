import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AppSettingRepository } from './persistence/app-setting.repository';
import { TauriAppSettingRepository } from './persistence/tauri-app-setting.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: AppSettingRepository, useClass: TauriAppSettingRepository },
  ],
};
