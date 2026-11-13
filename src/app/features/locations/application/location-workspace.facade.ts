/**
 * But
 * Regroupe les cas d’usage de la fiche lieu utilisés par l’écran de campagne.
 *
 * Responsabilités
 * - importe, résout et nettoie les images de la galerie ;
 * - enregistre un lieu puis actualise l’écran joueurs et retire les images abandonnées ;
 * - affiche ou retire un lieu ou l’une de ses images de l’écran joueurs ;
 * - supprime un lieu avec ses images propres à la campagne sans bloquer sur un nettoyage partiel ;
 */

import { inject, Injectable } from '@angular/core';

import { PlayerDisplayPublisher } from '@app/features/display/application/player-display-publisher.service';
import {
  isDisplayingResource,
  type PlayerDisplayState,
  type PlayerDisplayStateOf,
} from '@app/features/display/domain/player-display-state';
import { LocationService } from '@app/features/locations/application/location.service';
import { LocationImageGateway } from '@app/features/locations/data-access/location-image.gateway';
import {
  DEMO_LOCATION_IMAGE_URL,
  locationPlayerDisplayState,
  type Location,
  type UpdateLocationInput,
} from '@app/features/locations/domain/location';

export type ImportedLocationImages = Readonly<{
  paths: readonly string[];
  urls: readonly string[];
}>;

export type SaveLocationCommand = Readonly<{
  campaignId: string;
  existing: Location | null;
  input: UpdateLocationInput;
  imagePaths: readonly string[];
  selectedImagePath: string | null;
  isPlayerDisplayOpen: boolean;
}>;

export type SavedLocation = Readonly<{ location: Location; cleanupErrors: readonly unknown[] }>;

@Injectable({ providedIn: 'root' })
export class LocationWorkspaceFacade {
  private readonly locations = inject(LocationService);
  private readonly images = inject(LocationImageGateway);
  private readonly playerDisplay = inject(PlayerDisplayPublisher);

  readonly playerDisplayState = this.playerDisplay.state;

  isPlayerDisplayOpen(): Promise<boolean> {
    return this.playerDisplay.isOpen();
  }

  isDisplayed(location: Location, state: PlayerDisplayState = this.playerDisplay.state()): boolean {
    return isDisplayingResource(state, 'location', location.id);
  }

  imageUrls(paths: readonly string[]): Promise<readonly string[]> {
    return Promise.all(paths.map((path) => this.images.resolveUrl(path)));
  }

  async importImages(universeId: string): Promise<ImportedLocationImages> {
    const paths = await this.images.chooseAndImport(universeId);
    return { paths, urls: paths.length ? await this.imageUrls(paths) : [] };
  }

  /** Supprime des images sans s’interrompre ; retourne les erreurs rencontrées. */
  async discardImages(paths: readonly string[]): Promise<readonly unknown[]> {
    const errors: unknown[] = [];
    for (const path of paths) {
      try {
        await this.images.discard(path);
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
  }

  /** Enregistre le lieu, actualise l’écran joueurs puis retire les images sorties de la galerie. */
  async save(command: SaveLocationCommand): Promise<SavedLocation> {
    const { existing, input, imagePaths } = command;
    const location = existing
      ? await this.locations.update(existing, input, imagePaths)
      : await this.locations.create(command.campaignId, input, imagePaths);

    await this.playerDisplay.refresh(
      (state): state is PlayerDisplayStateOf<'location'> => this.isDisplayed(location, state),
      async (current) => ({
        ...current,
        ...locationPlayerDisplayState(location, await this.imageUrl(command.selectedImagePath)),
      }),
      command.isPlayerDisplayOpen,
    );

    const removedPaths = (existing?.imagePaths ?? []).filter(
      (path) => !location.imagePaths.includes(path),
    );
    return { location, cleanupErrors: await this.discardImages(removedPaths) };
  }

  /** Affiche l’image choisie du lieu aux joueurs, ou revient au fond neutre s’il est déjà affiché. */
  async toggleOnPlayerDisplay(location: Location, imageUrl: string): Promise<void> {
    await this.playerDisplay.toggle(
      location.campaignId,
      (state) => this.isDisplayed(location, state),
      () => locationPlayerDisplayState(location, imageUrl),
    );
  }

  /** Revient au fond neutre si l’image retirée de la galerie est celle affichée aux joueurs. */
  async withdrawImage(
    locationId: string | undefined,
    imageUrl: string,
    isPlayerDisplayOpen: boolean,
  ): Promise<void> {
    await this.playerDisplay.withdraw(
      (state) =>
        state.mode === 'location' &&
        state.locationId === locationId &&
        state.imagePath === imageUrl,
      isPlayerDisplayOpen,
    );
  }

  /** Supprime le lieu et ses images propres ; retourne les erreurs de nettoyage non bloquantes. */
  async delete(location: Location, isPlayerDisplayOpen: boolean): Promise<readonly unknown[]> {
    await this.playerDisplay.withdraw(
      (state) => this.isDisplayed(location, state),
      isPlayerDisplayOpen,
    );
    await this.locations.delete(location);
    return location.provenance === 'campaign' ? this.discardImages(location.imagePaths) : [];
  }

  private async imageUrl(path: string | null): Promise<string> {
    return path ? this.images.resolveUrl(path) : DEMO_LOCATION_IMAGE_URL;
  }
}
