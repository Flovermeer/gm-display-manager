import { isDisplayingResource } from '@app/features/display/domain/player-display-state';

describe('isDisplayingResource', () => {
  it('recognizes the resource currently shown to the players', () => {
    const state = { mode: 'location', locationId: 'tavern', imagePath: 'tavern.webp' } as const;

    expect(isDisplayingResource(state, 'location', 'tavern')).toBe(true);
    expect(isDisplayingResource(state, 'location', 'harbor')).toBe(false);
    expect(isDisplayingResource(state, 'npc', 'tavern')).toBe(false);
  });

  it('matches every displayable resource type', () => {
    expect(
      isDisplayingResource(
        { mode: 'npc', npcId: 'n', name: 'N', portraitPath: 'n.webp' },
        'npc',
        'n',
      ),
    ).toBe(true);
    expect(
      isDisplayingResource(
        { mode: 'monster', monsterId: 'm', name: 'M', imagePath: 'm.webp' },
        'monster',
        'm',
      ),
    ).toBe(true);
    expect(
      isDisplayingResource(
        { mode: 'item', itemId: 'i', name: 'I', imagePath: 'i.webp' },
        'item',
        'i',
      ),
    ).toBe(true);
    expect(
      isDisplayingResource(
        { mode: 'scene', sceneId: 's', background: { type: 'default' } },
        'scene',
        's',
      ),
    ).toBe(true);
  });

  it('never matches the neutral screen or an unknown resource type', () => {
    expect(isDisplayingResource({ mode: 'neutral' }, 'npc', 'n')).toBe(false);
    expect(isDisplayingResource({ mode: 'neutral' }, 'chapter', 'c')).toBe(false);
  });
});
