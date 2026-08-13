import { PlayerCharacterPortraitGateway } from '@app/media/player-character-portrait.gateway';

export class BrowserPlayerCharacterPortraitGateway extends PlayerCharacterPortraitGateway {
  override chooseAndImport(): Promise<string | null> {
    return Promise.reject(
      new Error("L'import de portraits est disponible dans l'application Tauri."),
    );
  }

  override resolveUrl(relativePath: string): Promise<string> {
    return Promise.resolve(relativePath);
  }

  override discard(): Promise<void> {
    return Promise.resolve();
  }
}
