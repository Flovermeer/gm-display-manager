/**
 * But
 * Regroupe les cas d’usage de la fiche objet utilisés par l’écran de campagne.
 *
 * Responsabilités
 * - importe, prévisualise et nettoie l’image en brouillon ;
 * - enregistre un objet puis retire l’image propre à la campagne qu’il remplace ;
 * - affiche ou retire un objet de l’écran joueurs ;
 * - supprime un objet avec son image propre sans bloquer sur un nettoyage partiel ;
 */

import { inject, Injectable } from '@angular/core';

import { PlayerDisplayPublisher } from '@app/features/display/application/player-display-publisher.service';
import {
  isDisplayingResource,
  type PlayerDisplayState,
} from '@app/features/display/domain/player-display-state';
import { NarrativeItemService } from '@app/features/items/application/narrative-item.service';
import { ItemImageGateway } from '@app/features/items/data-access/item-image.gateway';
import {
  DEMO_ITEM_IMAGE_URL,
  itemPlayerDisplayState,
  type NarrativeItem,
  type UpdateNarrativeItemInput,
} from '@app/features/items/domain/narrative-item';

export type ImportedItemImage = Readonly<{ path: string; url: string }>;

export type SaveNarrativeItemCommand = Readonly<{
  campaignId: string;
  existing: NarrativeItem | null;
  input: UpdateNarrativeItemInput;
  imagePath: string | null;
}>;

export type SavedNarrativeItem = Readonly<{
  item: NarrativeItem;
  cleanupErrors: readonly unknown[];
}>;

@Injectable({ providedIn: 'root' })
export class NarrativeItemWorkspaceFacade {
  private readonly items = inject(NarrativeItemService);
  private readonly images = inject(ItemImageGateway);
  private readonly playerDisplay = inject(PlayerDisplayPublisher);

  readonly playerDisplayState = this.playerDisplay.state;

  isPlayerDisplayOpen(): Promise<boolean> {
    return this.playerDisplay.isOpen();
  }

  isDisplayed(
    item: NarrativeItem,
    state: PlayerDisplayState = this.playerDisplay.state(),
  ): boolean {
    return isDisplayingResource(state, 'item', item.id);
  }

  async imageUrl(path: string | null): Promise<string> {
    return path ? this.images.resolveUrl(path) : DEMO_ITEM_IMAGE_URL;
  }

  async importImage(universeId: string): Promise<ImportedItemImage | null> {
    const path = await this.images.chooseAndImport(universeId);
    return path ? { path, url: await this.images.resolveUrl(path) } : null;
  }

  /** Supprime des images sans s’interrompre ; retourne les erreurs rencontrées. */
  async discardImages(paths: readonly (string | null)[]): Promise<readonly unknown[]> {
    const errors: unknown[] = [];
    for (const path of paths) {
      if (!path) continue;
      try {
        await this.images.discard(path);
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
  }

  /** Enregistre l’objet puis retire l’image propre à la campagne qu’il a remplacée. */
  async save(command: SaveNarrativeItemCommand): Promise<SavedNarrativeItem> {
    const { existing, input, imagePath } = command;
    const item = existing
      ? await this.items.update(existing, input, imagePath)
      : await this.items.create(command.campaignId, input, imagePath);

    const replacedImage =
      existing?.provenance === 'campaign' && existing.imagePath !== item.imagePath
        ? existing.imagePath
        : null;
    return { item, cleanupErrors: await this.discardImages([replacedImage]) };
  }

  /** Affiche l’objet aux joueurs, ou revient au fond neutre s’il est déjà affiché. */
  async toggleOnPlayerDisplay(item: NarrativeItem, imagePath: string): Promise<void> {
    await this.playerDisplay.toggle(
      item.campaignId,
      (state) => this.isDisplayed(item, state),
      async () => itemPlayerDisplayState(item, await this.images.resolveUrl(imagePath)),
    );
  }

  /** Supprime l’objet et son image propre ; retourne les erreurs de nettoyage non bloquantes. */
  async delete(item: NarrativeItem, isPlayerDisplayOpen: boolean): Promise<readonly unknown[]> {
    await this.playerDisplay.withdraw(
      (state) => this.isDisplayed(item, state),
      isPlayerDisplayOpen,
    );
    await this.items.delete(item);
    return item.provenance === 'campaign' ? this.discardImages([item.imagePath]) : [];
  }
}
