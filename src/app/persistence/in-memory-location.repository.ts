import type { Location } from '@app/location/location';
import { LocationRepository } from '@app/location/location.repository';

export class InMemoryLocationRepository extends LocationRepository {
  private readonly locations = new Map<string, Location>();

  override listByCampaign(campaignId: string): Promise<readonly Location[]> {
    return Promise.resolve(
      [...this.locations.values()]
        .filter((location) => location.campaignId === campaignId)
        .sort(
          (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
        ),
    );
  }

  override findById(campaignId: string, id: string): Promise<Location | null> {
    const location = this.locations.get(id);
    return Promise.resolve(location?.campaignId === campaignId ? location : null);
  }

  override save(location: Location): Promise<void> {
    this.locations.set(location.id, location);
    return Promise.resolve();
  }

  override delete(campaignId: string, id: string): Promise<void> {
    const location = this.locations.get(id);
    if (location?.campaignId === campaignId) {
      this.locations.delete(id);
      for (const child of this.locations.values()) {
        if (child.parentLocationId === id) {
          this.locations.set(child.id, { ...child, parentLocationId: null });
        }
      }
    }
    return Promise.resolve();
  }
}
