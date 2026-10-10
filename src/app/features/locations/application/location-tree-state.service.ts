/**
 * But
 * Mémorise les branches repliées de l'arborescence des lieux pour chaque campagne.
 *
 * Responsabilités
 * - sérialise les identifiants dans les préférences locales de l'application ;
 * - isole les campagnes et ignore les données de préférence invalides.
 */

import { inject, Injectable } from '@angular/core';

import { AppSettingRepository } from '@app/core/persistence/app-setting.repository';

const COLLAPSED_LOCATIONS_KEY_PREFIX = 'campaign.locations.collapsed.';

@Injectable({ providedIn: 'root' })
export class LocationTreeStateService {
  private readonly settings = inject(AppSettingRepository);

  async load(campaignId: string): Promise<ReadonlySet<string>> {
    const serializedIds = await this.settings.get(this.key(campaignId));
    if (!serializedIds) return new Set();

    try {
      const ids: unknown = JSON.parse(serializedIds);
      return Array.isArray(ids)
        ? new Set(ids.filter((id): id is string => typeof id === 'string'))
        : new Set();
    } catch {
      return new Set();
    }
  }

  save(campaignId: string, collapsedLocationIds: ReadonlySet<string>): Promise<void> {
    const key = this.key(campaignId);
    if (collapsedLocationIds.size === 0) return this.settings.delete(key);
    return this.settings.set(key, JSON.stringify([...collapsedLocationIds].sort()));
  }

  private key(campaignId: string): string {
    return `${COLLAPSED_LOCATIONS_KEY_PREFIX}${campaignId}`;
  }
}
