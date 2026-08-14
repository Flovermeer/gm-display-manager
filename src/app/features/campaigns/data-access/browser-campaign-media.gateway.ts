/**
 * But
 * Fournit un substitut sans filesystem natif pour le navigateur.
 *
 * Responsabilités
 * - permet d’exécuter l’interface hors de Tauri ;
 * - respecte le contrat média sans écrire de fichier ;
 */

import { CampaignMediaGateway } from '@app/features/campaigns/data-access/campaign-media.gateway';

export class BrowserCampaignMediaGateway extends CampaignMediaGateway {
  override discardCampaign(): Promise<void> {
    return Promise.resolve();
  }
}
