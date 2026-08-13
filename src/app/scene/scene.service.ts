import { inject, Injectable } from '@angular/core';

import { LocationService } from '../location/location.service';
import { NarrativeItemService } from '../narrative-item/narrative-item.service';
import { NpcService } from '../npc/npc.service';
import { createScene, updateScene, type Scene, type UpdateSceneInput } from './scene';
import { SceneRepository } from './scene.repository';

@Injectable({ providedIn: 'root' })
export class SceneService {
  private readonly repository = inject(SceneRepository);
  private readonly locationService = inject(LocationService);
  private readonly npcService = inject(NpcService);
  private readonly itemService = inject(NarrativeItemService);

  list(campaignId: string): Promise<readonly Scene[]> {
    return this.repository.listByCampaign(campaignId);
  }

  findById(campaignId: string, id: string): Promise<Scene | null> {
    return this.repository.findById(campaignId, id);
  }

  async create(campaignId: string, input: UpdateSceneInput): Promise<Scene> {
    await this.assertReferences(campaignId, input);
    const scene = createScene(campaignId, input);
    await this.repository.save(scene);
    return scene;
  }

  async update(scene: Scene, input: UpdateSceneInput): Promise<Scene> {
    await this.assertReferences(scene.campaignId, input);
    const updated = updateScene(scene, input);
    await this.repository.save(updated);
    return updated;
  }

  delete(scene: Scene): Promise<void> {
    return this.repository.delete(scene.campaignId, scene.id);
  }

  private async assertReferences(campaignId: string, input: UpdateSceneInput): Promise<void> {
    const [locations, npcs, items] = await Promise.all([
      this.locationService.list(campaignId),
      this.npcService.list(campaignId),
      this.itemService.list(campaignId),
    ]);
    if (input.locationId && !locations.some(({ id }) => id === input.locationId)) {
      throw new Error("Le lieu de la scène n'appartient pas à cette campagne.");
    }
    if (input.npcIds.some((id) => !npcs.some((npc) => npc.id === id))) {
      throw new Error("Un PNJ de la scène n'appartient pas à cette campagne.");
    }
    if (input.itemIds.some((id) => !items.some((item) => item.id === id))) {
      throw new Error("Un objet de la scène n'appartient pas à cette campagne.");
    }
  }
}
