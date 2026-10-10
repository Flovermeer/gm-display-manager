/**
 * But
 * Conserve les lieux et leurs associations en mémoire hors de Tauri.
 *
 * Responsabilités
 * - sert d'adaptateur navigateur et de doublure de test ;
 * - reproduit les imports, personnalisations et promotions hiérarchiques.
 */

import type { Location } from '@app/features/locations/domain/location';
import { LocationRepository } from '@app/features/locations/data-access/location.repository';
import {
  createEmptyRichTextDocument,
  type RichTextDocument,
} from '@app/shared/rich-text-editor/rich-text-document';

export class InMemoryLocationRepository extends LocationRepository {
  private readonly locations = new Map<string, Location>();
  private readonly campaignIds = new Map<string, Set<string>>();
  private readonly overrides = new Map<string, Location>();
  private readonly descriptions = new Map<string, RichTextDocument>();
  private readonly galleries = new Map<string, readonly string[]>();

  override listByCampaign(campaignId: string): Promise<readonly Location[]> {
    const ids = this.campaignIds.get(campaignId) ?? new Set<string>();
    return Promise.resolve(
      sort(
        [...ids].flatMap((id) => {
          const location = this.locations.get(id);
          return location ? [this.effective(location, campaignId)] : [];
        }),
      ),
    );
  }

  override listAvailableByCampaign(campaignId: string): Promise<readonly Location[]> {
    const selected = this.campaignIds.get(campaignId) ?? new Set<string>();
    return Promise.resolve(
      sort(
        [...this.locations.values()]
          .filter((location) => location.provenance === 'universe' && !selected.has(location.id))
          .map((location) => ({
            ...location,
            campaignId,
            description: createEmptyRichTextDocument(),
          })),
      ),
    );
  }

  override findById(campaignId: string, id: string): Promise<Location | null> {
    const location = this.locations.get(id);
    return Promise.resolve(
      location && this.campaignIds.get(campaignId)?.has(id)
        ? this.effective(location, campaignId)
        : null,
    );
  }

  override async save(location: Location): Promise<void> {
    if (location.provenance === 'campaign') {
      this.locations.set(location.id, location);
    } else {
      this.overrides.set(this.key(location.campaignId, location.id), {
        ...location,
        provenance: 'override',
      });
    }
    this.galleries.set(location.id, location.imagePaths);
    this.descriptions.set(this.key(location.campaignId, location.id), location.description);
    this.associate(location.campaignId, location.id);
  }

  override delete(campaignId: string, id: string): Promise<void> {
    const location = this.locations.get(id);
    if (location?.provenance === 'campaign' && location.campaignId === campaignId) {
      this.locations.delete(id);
      this.galleries.delete(id);
      for (const child of this.locations.values()) {
        if (
          child.parentLocationId === id &&
          child.provenance === 'campaign' &&
          child.campaignId === campaignId
        ) {
          this.locations.set(child.id, { ...child, parentLocationId: null });
        }
      }
    }
    this.overrides.delete(this.key(campaignId, id));
    this.descriptions.delete(this.key(campaignId, id));
    this.campaignIds.get(campaignId)?.delete(id);
    return Promise.resolve();
  }

  override attach(campaignId: string, id: string): Promise<void> {
    let current = this.locations.get(id);
    const ancestors: Location[] = [];
    const visited = new Set<string>();
    while (current?.provenance === 'universe' && !visited.has(current.id)) {
      visited.add(current.id);
      ancestors.unshift(current);
      current = current.parentLocationId ? this.locations.get(current.parentLocationId) : undefined;
    }
    if (!ancestors.some((location) => location.id === id)) {
      return Promise.reject(new Error('Lieu indisponible.'));
    }
    for (const location of ancestors) this.associate(campaignId, location.id);
    return Promise.resolve();
  }

  override async promotionPlan(campaignId: string, id: string): Promise<readonly Location[]> {
    const plan: Location[] = [];
    let current = this.locations.get(id);
    const visited = new Set<string>();
    while (
      current?.campaignId === campaignId &&
      current.provenance === 'campaign' &&
      !visited.has(current.id)
    ) {
      visited.add(current.id);
      plan.unshift(current);
      current = current.parentLocationId ? this.locations.get(current.parentLocationId) : undefined;
    }
    return plan;
  }

  override async promote(campaignId: string, id: string): Promise<void> {
    const plan = await this.promotionPlan(campaignId, id);
    if (plan.length === 0) {
      throw new Error("Seul un lieu local peut être enregistré dans l'univers.");
    }
    for (const location of plan) {
      this.locations.set(location.id, { ...location, provenance: 'universe' });
    }
  }

  override resetOverride(campaignId: string, id: string): Promise<void> {
    this.overrides.delete(this.key(campaignId, id));
    return Promise.resolve();
  }

  private associate(campaignId: string, id: string): void {
    const ids = this.campaignIds.get(campaignId) ?? new Set<string>();
    ids.add(id);
    this.campaignIds.set(campaignId, ids);
    const key = this.key(campaignId, id);
    if (!this.descriptions.has(key)) {
      this.descriptions.set(key, createEmptyRichTextDocument());
    }
  }

  private effective(location: Location, campaignId: string): Location {
    const key = this.key(campaignId, location.id);
    const effective = this.overrides.get(key) ?? { ...location, campaignId };
    const imagePaths = this.galleries.get(location.id) ?? location.imagePaths;
    return {
      ...effective,
      description: this.descriptions.get(key) ?? createEmptyRichTextDocument(),
      imagePaths,
      imagePath: imagePaths[0] ?? null,
    };
  }

  private key(campaignId: string, id: string): string {
    return `${campaignId}:${id}`;
  }
}

function sort(values: Location[]): readonly Location[] {
  return values.sort(
    (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
  );
}
