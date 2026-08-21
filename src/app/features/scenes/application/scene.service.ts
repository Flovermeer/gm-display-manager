/**
 * But
 * Orchestre le cycle de vie des scènes.
 *
 * Responsabilités
 * - valide que les ressources associées appartiennent à la campagne ;
 * - coordonne la persistance sans connaître SQLite ;
 */

import { inject, Injectable } from '@angular/core';

import { LocationService } from '@app/features/locations/application/location.service';
import { NarrativeItemService } from '@app/features/items/application/narrative-item.service';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { MonsterService } from '@app/features/bestiary/application/monster.service';
import { ChapterService } from '@app/features/chapters/application/chapter.service';
import {
  createScene,
  moveSceneToChapter,
  updateScene,
  type Scene,
  type UpdateSceneInput,
} from '@app/features/scenes/domain/scene';
import { SceneRepository } from '@app/features/scenes/data-access/scene.repository';

@Injectable({ providedIn: 'root' })
export class SceneService {
  private readonly repository = inject(SceneRepository);
  private readonly chapterService = inject(ChapterService);
  private readonly locationService = inject(LocationService);
  private readonly npcService = inject(NpcService);
  private readonly monsterService = inject(MonsterService);
  private readonly itemService = inject(NarrativeItemService);

  list(campaignId: string): Promise<readonly Scene[]> {
    return this.repository.listByCampaign(campaignId);
  }

  listByChapter(campaignId: string, chapterId: string): Promise<readonly Scene[]> {
    return this.repository.listByChapter(campaignId, chapterId);
  }

  findById(campaignId: string, id: string): Promise<Scene | null> {
    return this.repository.findById(campaignId, id);
  }

  async create(campaignId: string, chapterId: string, input: UpdateSceneInput): Promise<Scene> {
    await this.assertChapter(campaignId, chapterId);
    await this.assertReferences(campaignId, input);
    const scenes = await this.repository.listByChapter(campaignId, chapterId);
    const nextPosition = scenes.reduce(
      (position, scene) => Math.max(position, scene.position + 1),
      0,
    );
    const scene = createScene(campaignId, chapterId, nextPosition, input);
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

  async moveToChapter(scene: Scene, chapterId: string): Promise<Scene> {
    if (scene.chapterId === chapterId) return scene;
    await this.assertChapter(scene.campaignId, chapterId);
    const targetScenes = await this.repository.listByChapter(scene.campaignId, chapterId);
    const nextPosition = targetScenes.reduce(
      (position, candidate) => Math.max(position, candidate.position + 1),
      0,
    );
    const moved = moveSceneToChapter(scene, chapterId, nextPosition);
    await this.repository.save(moved);
    return moved;
  }

  async move(scene: Scene, direction: -1 | 1): Promise<Scene> {
    const scenes = await this.repository.listByChapter(scene.campaignId, scene.chapterId);
    const currentIndex = scenes.findIndex(({ id }) => id === scene.id);
    const neighbour = scenes[currentIndex + direction];
    if (currentIndex < 0 || !neighbour) return scene;
    const updatedAt = new Date().toISOString();
    const moved = { ...scene, position: neighbour.position, updatedAt };
    const movedNeighbour = { ...neighbour, position: scene.position, updatedAt };
    await this.repository.updateOrder([moved, movedNeighbour]);
    return moved;
  }

  private async assertChapter(campaignId: string, chapterId: string): Promise<void> {
    if (!(await this.chapterService.findById(campaignId, chapterId))) {
      throw new Error("Le chapitre de la scène n'appartient pas à cette campagne.");
    }
  }

  private async assertReferences(campaignId: string, input: UpdateSceneInput): Promise<void> {
    const [locations, npcs, monsters, items] = await Promise.all([
      this.locationService.list(campaignId),
      this.npcService.list(campaignId),
      this.monsterService.list(campaignId),
      this.itemService.list(campaignId),
    ]);
    if (input.locationId && !locations.some(({ id }) => id === input.locationId)) {
      throw new Error("Le lieu de la scène n'appartient pas à cette campagne.");
    }
    if (input.npcIds.some((id) => !npcs.some((npc) => npc.id === id))) {
      throw new Error("Un PNJ de la scène n'appartient pas à cette campagne.");
    }
    if (input.monsterIds.some((id) => !monsters.some((monster) => monster.id === id))) {
      throw new Error("Un monstre de la scène n'appartient pas à cette campagne.");
    }
    if (input.itemIds.some((id) => !items.some((item) => item.id === id))) {
      throw new Error("Un objet de la scène n'appartient pas à cette campagne.");
    }
  }
}
