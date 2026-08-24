/**
 * But
 * Construire la carte de campagne à partir des données métier existantes.
 *
 * Responsabilités
 * - charger chapitres et scènes sans créer de persistance parallèle ;
 * - exposer un modèle ordonné dédié à la lecture et à la navigation.
 */

import { inject, Injectable } from '@angular/core';

import type { Campaign } from '@app/features/campaigns/domain/campaign';
import { ChapterService } from '@app/features/chapters/application/chapter.service';
import { SceneService } from '@app/features/scenes/application/scene.service';
import { buildCampaignMap, type CampaignMap } from '@app/features/campaign-map/domain/campaign-map';

@Injectable({ providedIn: 'root' })
export class CampaignMapService {
  private readonly chapterService = inject(ChapterService);
  private readonly sceneService = inject(SceneService);

  async load(campaign: Campaign): Promise<CampaignMap> {
    const [chapters, scenes] = await Promise.all([
      this.chapterService.list(campaign.id),
      this.sceneService.list(campaign.id),
    ]);
    return buildCampaignMap(campaign, chapters, scenes);
  }
}
