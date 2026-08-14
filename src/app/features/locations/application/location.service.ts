/**
 * But
 * Orchestre le cycle de vie des lieux.
 *
 * Responsabilités
 * - applique les règles de création et de modification ;
 * - coordonne le repository et les médias associés ;
 */

import { inject, Injectable } from '@angular/core';

import {
  createLocation,
  updateLocation,
  type Location,
  type UpdateLocationInput,
} from '@app/features/locations/domain/location';
import { LocationRepository } from '@app/features/locations/data-access/location.repository';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly repository = inject(LocationRepository);

  list(campaignId: string): Promise<readonly Location[]> {
    return this.repository.listByCampaign(campaignId);
  }

  async create(
    campaignId: string,
    input: UpdateLocationInput,
    imagePath: string | null = null,
  ): Promise<Location> {
    await this.assertValidParent(campaignId, null, input.parentLocationId);
    const location = createLocation({ campaignId, ...input, imagePath });
    await this.repository.save(location);
    return location;
  }

  async update(
    location: Location,
    input: UpdateLocationInput,
    imagePath: string | null = location.imagePath,
  ): Promise<Location> {
    await this.assertValidParent(location.campaignId, location.id, input.parentLocationId);
    const updatedLocation = { ...updateLocation(location, input), imagePath };
    await this.repository.save(updatedLocation);
    return updatedLocation;
  }

  delete(location: Location): Promise<void> {
    return this.repository.delete(location.campaignId, location.id);
  }

  private async assertValidParent(
    campaignId: string,
    locationId: string | null,
    parentLocationId: string | null,
  ): Promise<void> {
    if (!parentLocationId) {
      return;
    }

    const locations = await this.repository.listByCampaign(campaignId);
    const byId = new Map(locations.map((location) => [location.id, location]));
    let currentId: string | null = parentLocationId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === locationId) {
        throw new Error('Un lieu ne peut pas être placé dans un de ses descendants.');
      }
      if (visited.has(currentId)) {
        throw new Error('La hiérarchie des lieux contient déjà une boucle.');
      }

      visited.add(currentId);
      const current = byId.get(currentId);
      if (!current) {
        throw new Error("Le lieu parent n'appartient pas à cette campagne.");
      }
      currentId = current.parentLocationId;
    }
  }
}
