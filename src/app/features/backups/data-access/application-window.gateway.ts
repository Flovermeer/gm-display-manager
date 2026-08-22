/**
 * But
 * Isole le cycle de fermeture de la fenêtre principale Tauri.
 *
 * Responsabilités
 * - intercepte une demande de fermeture normale ;
 * - ferme réellement la fenêtre après la décision du MJ ;
 * - désactive ce comportement dans le navigateur et les fenêtres secondaires.
 */

import type { UnlistenFn } from '@tauri-apps/api/event';

export abstract class ApplicationWindowGateway {
  abstract readonly isPrimaryWindow: boolean;
  abstract listenForCloseRequest(callback: () => void): Promise<UnlistenFn>;
  abstract close(): Promise<void>;
}
