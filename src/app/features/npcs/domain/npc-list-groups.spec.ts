import { createNpc, type Npc } from '@app/features/npcs/domain/npc';
import { groupNpcsByKind } from '@app/features/npcs/domain/npc-list-groups';

describe('groupNpcsByKind', () => {
  function npc(name: string, kind: Npc['kind']): Npc {
    return createNpc({ campaignId: 'campaign-id', name, kind });
  }

  it('lists organizations before characters and keeps the order inside each group', () => {
    const groups = groupNpcsByKind([
      npc('Mira Vell', 'character'),
      npc('Les Zhentarim', 'organization'),
      npc('Syndra Silvane', 'character'),
      npc('Ménestrels', 'organization'),
    ]);

    expect(groups.map(({ label, npcs }) => [label, npcs.map(({ name }) => name)])).toEqual([
      ['Organisation', ['Les Zhentarim', 'Ménestrels']],
      ['PNJ', ['Mira Vell', 'Syndra Silvane']],
    ]);
  });

  it('omits an empty group', () => {
    expect(groupNpcsByKind([npc('Mira Vell', 'character')]).map(({ kind }) => kind)).toEqual([
      'character',
    ]);
    expect(groupNpcsByKind([])).toEqual([]);
  });
});
