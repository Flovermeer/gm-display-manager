/**
 * But
 * Persiste l'historique récent d'une campagne dans SQLite.
 *
 * Responsabilités
 * - enregistre ou remonte une ressource consultée ;
 * - restitue les entrées de la plus récente à la plus ancienne.
 */

import { Injectable } from '@angular/core';
import Database from '@tauri-apps/plugin-sql';

import { RecentResourceRepository } from '@app/features/recent-resources/data-access/recent-resource.repository';
import {
  RECENT_RESOURCE_LIMIT,
  type RecentResource,
  type RecentResourceType,
} from '@app/features/recent-resources/domain/recent-resource';

const DATABASE_URL = 'sqlite:beholders-inn.db';

type RecentResourceRow = Readonly<{
  campaign_id: string;
  resource_type: RecentResourceType;
  resource_id: string;
  display_name: string;
  viewed_order: number;
}>;

@Injectable()
export class TauriRecentResourceRepository extends RecentResourceRepository {
  private databasePromise?: Promise<Database>;

  override async list(campaignId: string): Promise<readonly RecentResource[]> {
    const rows = await (
      await this.database()
    ).select<RecentResourceRow[]>(
      `SELECT campaign_id, resource_type, resource_id, display_name, viewed_order
       FROM recent_resource
       WHERE campaign_id=$1
       ORDER BY viewed_order DESC
       LIMIT ${RECENT_RESOURCE_LIMIT}`,
      [campaignId],
    );
    return rows.map(mapRecentResource);
  }

  override async save(resource: RecentResource): Promise<void> {
    const result = await (
      await this.database()
    ).execute(
      `INSERT INTO recent_resource(
         campaign_id, resource_type, resource_id, display_name, viewed_order
       ) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT(campaign_id, resource_type, resource_id) DO UPDATE SET
         display_name=excluded.display_name,
         viewed_order=excluded.viewed_order`,
      [
        resource.campaignId,
        resource.resourceType,
        resource.resourceId,
        resource.displayName,
        resource.viewedOrder,
      ],
    );
    if (result.rowsAffected !== 1) throw new Error("Impossible d'enregistrer l'historique récent.");
  }

  override async remove(
    campaignId: string,
    resourceType: RecentResourceType,
    resourceId: string,
  ): Promise<void> {
    await (
      await this.database()
    ).execute(
      `DELETE FROM recent_resource
       WHERE campaign_id=$1 AND resource_type=$2 AND resource_id=$3`,
      [campaignId, resourceType, resourceId],
    );
  }

  private database(): Promise<Database> {
    this.databasePromise ??= Database.load(DATABASE_URL).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });
    return this.databasePromise;
  }
}

function mapRecentResource(row: RecentResourceRow): RecentResource {
  return {
    campaignId: row.campaign_id,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    displayName: row.display_name,
    viewedOrder: row.viewed_order,
  };
}
