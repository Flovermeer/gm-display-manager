import { createLocation, type Location } from '@app/features/locations/domain/location';
import {
  buildLocationEntries,
  descendantIds,
  hideCollapsedDescendants,
} from '@app/features/locations/domain/location-tree';

function location(id: string, name: string, parentLocationId: string | null = null): Location {
  return {
    ...createLocation(
      { campaignId: 'campaign-id', name, parentLocationId },
      { createId: () => id, now: () => new Date('2026-11-13T00:00:00.000Z') },
    ),
  };
}

describe('location tree', () => {
  const chult = location('chult', 'Chult');
  const port = location('port', 'Port Nyanzaru', 'chult');
  const inn = location('inn', "Beholder's Inn", 'port');
  const amn = location('amn', 'Amn');

  it('orders siblings by name and builds readable paths', () => {
    expect(
      buildLocationEntries([inn, chult, port, amn]).map(({ path, depth }) => [path, depth]),
    ).toEqual([
      ['Amn', 0],
      ['Chult', 0],
      ['Chult › Port Nyanzaru', 1],
      ["Chult › Port Nyanzaru › Beholder's Inn", 2],
    ]);
  });

  it('hides the descendants of a collapsed branch', () => {
    const entries = buildLocationEntries([chult, port, inn, amn]);

    expect(
      hideCollapsedDescendants(entries, new Set(['chult'])).map(({ location }) => location.id),
    ).toEqual(['amn', 'chult']);
  });

  it('lists every descendant of a location', () => {
    expect([...descendantIds([chult, port, inn, amn], 'chult')].sort()).toEqual(['inn', 'port']);
  });
});
