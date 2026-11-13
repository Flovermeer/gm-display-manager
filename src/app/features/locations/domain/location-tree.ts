import type { Location } from '@app/features/locations/domain/location';

export type LocationListEntry = Readonly<{
  location: Location;
  depth: number;
  path: string;
  hasChildren: boolean;
}>;

/** Ordonne les lieux en arbre (frères triés par nom) et calcule leur chemin lisible. */
export function buildLocationEntries(locations: readonly Location[]): readonly LocationListEntry[] {
  const byParent = new Map<string | null, Location[]>();
  for (const location of locations) {
    const siblings = byParent.get(location.parentLocationId) ?? [];
    siblings.push(location);
    byParent.set(location.parentLocationId, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort(
      (left, right) => left.name.localeCompare(right.name, 'fr') || left.id.localeCompare(right.id),
    );
  }

  const entries: LocationListEntry[] = [];
  const visited = new Set<string>();
  const append = (parentId: string | null, depth: number, parentPath: string) => {
    for (const location of byParent.get(parentId) ?? []) {
      if (visited.has(location.id)) {
        continue;
      }
      visited.add(location.id);
      const path = parentPath ? `${parentPath} › ${location.name}` : location.name;
      entries.push({
        location,
        depth,
        path,
        hasChildren: (byParent.get(location.id)?.length ?? 0) > 0,
      });
      append(location.id, depth + 1, path);
    }
  };

  append(null, 0, '');
  for (const location of locations) {
    if (!visited.has(location.id)) {
      entries.push({
        location,
        depth: 0,
        path: location.name,
        hasChildren: (byParent.get(location.id)?.length ?? 0) > 0,
      });
    }
  }
  return entries;
}

/** Masque les descendants des branches repliées. */
export function hideCollapsedDescendants(
  entries: readonly LocationListEntry[],
  collapsedLocationIds: ReadonlySet<string>,
): readonly LocationListEntry[] {
  const hiddenDepths: number[] = [];

  return entries.filter((entry) => {
    while (hiddenDepths.length > 0 && entry.depth <= hiddenDepths.at(-1)!) {
      hiddenDepths.pop();
    }

    const isHidden = hiddenDepths.length > 0;
    if (!isHidden && collapsedLocationIds.has(entry.location.id)) {
      hiddenDepths.push(entry.depth);
    }
    return !isHidden;
  });
}

/** Identifiants de tous les descendants d’un lieu. */
export function descendantIds(locations: readonly Location[], parentId: string): Set<string> {
  const descendants = new Set<string>();
  const pending = [parentId];
  while (pending.length > 0) {
    const currentId = pending.pop();
    for (const location of locations) {
      if (location.parentLocationId === currentId && !descendants.has(location.id)) {
        descendants.add(location.id);
        pending.push(location.id);
      }
    }
  }
  return descendants;
}
