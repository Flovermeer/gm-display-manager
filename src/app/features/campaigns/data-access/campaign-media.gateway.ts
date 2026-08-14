/**
 * But
 * Définit le port de gestion des fichiers appartenant à une campagne.
 *
 * Responsabilités
 * - masque les détails du filesystem à la couche application ;
 * - encadre la suppression des médias d’une campagne ;
 */

export abstract class CampaignMediaGateway {
  abstract discardCampaign(campaignId: string): Promise<void>;
}
