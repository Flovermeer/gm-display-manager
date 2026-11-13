/**
 * But
 * Regroupe les cas d’usage de la fiche de monstre utilisés par le bestiaire de campagne.
 *
 * Responsabilités
 * - importe, prévisualise et nettoie l’image en brouillon ;
 * - enregistre un monstre puis retire l’image qu’un nouvel import a remplacée ;
 */

import { inject, Injectable } from '@angular/core';

import { MonsterService } from '@app/features/bestiary/application/monster.service';
import { MonsterImageGateway } from '@app/features/bestiary/data-access/monster-image.gateway';
import type { Monster, MonsterSheet } from '@app/features/bestiary/domain/monster';

export type ImportedMonsterImage = Readonly<{ path: string; url: string }>;

export type SaveMonsterCommand = Readonly<{
  campaignId: string;
  existing: Monster | null;
  name: string;
  sheet: MonsterSheet;
  importedImagePath: string | null;
}>;

@Injectable({ providedIn: 'root' })
export class MonsterWorkspaceFacade {
  private readonly monsters = inject(MonsterService);
  private readonly images = inject(MonsterImageGateway);

  async imageUrl(path: string | null): Promise<string | null> {
    return path ? this.images.resolveUrl(path) : null;
  }

  async importImage(universeId: string): Promise<ImportedMonsterImage | null> {
    const path = await this.images.chooseAndImport(universeId);
    return path ? { path, url: await this.images.resolveUrl(path) } : null;
  }

  /** Supprime une image sans bloquer le MJ : un échec de nettoyage est ignoré. */
  async discardImage(path: string | null): Promise<void> {
    if (!path) return;
    try {
      await this.images.discard(path);
    } catch {
      // Le nettoyage ne doit pas empêcher le MJ d'abandonner un brouillon.
    }
  }

  /** Enregistre le monstre ; l’image remplacée par un nouvel import est ensuite retirée. */
  async save(command: SaveMonsterCommand): Promise<Monster> {
    const { existing, importedImagePath } = command;
    const previousImagePath = existing?.imagePath ?? null;
    const input = {
      name: command.name,
      imagePath: importedImagePath ?? previousImagePath,
      sheet: command.sheet,
    };
    const saved = existing
      ? await this.monsters.update(existing, input)
      : await this.monsters.create(command.campaignId, input);

    if (importedImagePath && previousImagePath && previousImagePath !== importedImagePath) {
      await this.discardImage(previousImagePath);
    }
    return saved;
  }
}
