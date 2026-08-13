import { LocationImageGateway } from '@app/media/location-image.gateway';

export class BrowserLocationImageGateway extends LocationImageGateway {
  override chooseAndImport(): Promise<string | null> {
    return Promise.reject(
      new Error("L'import d'illustrations est disponible dans l'application Tauri."),
    );
  }

  override resolveUrl(relativePath: string): Promise<string> {
    return Promise.resolve(relativePath);
  }

  override discard(): Promise<void> {
    return Promise.resolve();
  }
}
