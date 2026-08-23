/**
 * But
 * Définir le port de contrôle des médias référencés par SQLite.
 *
 * Responsabilités
 * - lister les références sans exposer les détails du schéma ;
 * - vérifier et remplacer un fichier dans le stockage applicatif.
 */

import type { MediaReference } from '@app/features/diagnostics/domain/diagnostic.models';

export type MediaFileStatus = 'healthy' | 'missing' | 'inaccessible';

export abstract class MediaDiagnosticGateway {
  abstract readonly isAvailable: boolean;
  abstract readonly isPrimaryWindow: boolean;

  abstract listReferences(): Promise<readonly MediaReference[]>;
  abstract inspectFile(reference: MediaReference): Promise<MediaFileStatus>;
  abstract replaceFile(reference: MediaReference): Promise<boolean>;
}
