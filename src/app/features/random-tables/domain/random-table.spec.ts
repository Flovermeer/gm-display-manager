import {
  createRandomTable,
  randomTableRollIssue,
  rollRandomTable,
  type RandomTable,
} from '@app/features/random-tables/domain/random-table';

describe('random table domain', () => {
  it('sorts complete and incomplete entries automatically by their lower bound', () => {
    const table = createRandomTable(
      'campaign-id',
      {
        name: 'Rencontres',
        description: '',
        entries: [
          { minimum: 6, maximum: 10, resultText: 'Gobelins' },
          { minimum: null, maximum: null, resultText: '' },
          { minimum: 1, maximum: 5, resultText: 'Voyageurs' },
        ],
      },
      dependencies,
    );

    expect(table.entries.map(({ minimum }) => minimum)).toEqual([1, 6, null]);
  });

  it('requires continuous non-overlapping coverage before rolling', () => {
    expect(
      randomTableRollIssue(
        tableWith([
          [1, 2],
          [4, 6],
        ]),
      ),
    ).toContain('sans trou');
    expect(
      randomTableRollIssue(
        tableWith([
          [1, 3],
          [3, 6],
        ]),
      ),
    ).toContain('sans trou');
    expect(randomTableRollIssue(tableWith([[2, 6]]))).toContain('commencer à 1');
    expect(randomTableRollIssue(tableWith([[1, 100]]))).toBeNull();
  });

  it('returns the entry matching a uniformly drawn value', () => {
    const table = tableWith([
      [1, 2],
      [3, 5],
    ]);

    expect(rollRandomTable(table, () => 0)).toMatchObject({
      value: 1,
      entry: { resultText: '1-2' },
    });
    expect(rollRandomTable(table, () => 0.999)).toMatchObject({
      value: 5,
      entry: { resultText: '3-5' },
    });
  });

  it('allows incomplete rows to be saved but not rolled', () => {
    const table = createRandomTable(
      'campaign-id',
      {
        name: 'Trésors',
        description: '',
        entries: [{ minimum: 1, maximum: null, resultText: '' }],
      },
      dependencies,
    );

    expect(table.entries).toHaveLength(1);
    expect(randomTableRollIssue(table)).toContain('Complète');
  });
});

const dependencies = {
  createId: vi.fn(() => crypto.randomUUID()),
  now: () => new Date('2026-08-20T12:00:00.000Z'),
};

function tableWith(ranges: readonly (readonly [number, number])[]): RandomTable {
  return {
    id: 'table-id',
    campaignId: 'campaign-id',
    name: 'Rencontres',
    description: '',
    entries: ranges.map(([minimum, maximum], index) => ({
      id: `entry-${index}`,
      minimum,
      maximum,
      resultText: `${minimum}-${maximum}`,
    })),
    createdAt: '2026-08-20T12:00:00.000Z',
    updatedAt: '2026-08-20T12:00:00.000Z',
  };
}
