/**
 * But
 * Conserve les scènes et leurs relations en mémoire.
 *
 * Responsabilités
 * - sert au navigateur et aux tests hors Tauri ;
 */

import type { Scene } from '@app/features/scenes/domain/scene';
import { SceneRepository } from '@app/features/scenes/data-access/scene.repository';

export class InMemorySceneRepository extends SceneRepository {
  private readonly scenes = new Map<string, Scene>();

  override listByCampaign(campaignId: string): Promise<readonly Scene[]> {
    return Promise.resolve(
      [...this.scenes.values()]
        .filter((scene) => scene.campaignId === campaignId)
        .sort((left, right) => left.name.localeCompare(right.name, 'fr')),
    );
  }

  override findById(campaignId: string, id: string): Promise<Scene | null> {
    const scene = this.scenes.get(id);
    return Promise.resolve(scene?.campaignId === campaignId ? scene : null);
  }

  override save(scene: Scene): Promise<void> {
    this.scenes.set(scene.id, scene);
    return Promise.resolve();
  }

  override delete(campaignId: string, id: string): Promise<void> {
    const scene = this.scenes.get(id);
    if (scene?.campaignId === campaignId) this.scenes.delete(id);
    return Promise.resolve();
  }
}
