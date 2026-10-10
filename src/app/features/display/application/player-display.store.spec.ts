import { PlayerDisplayStore } from '@app/features/display/application/player-display.store';

describe('PlayerDisplayStore', () => {
  it('starts with the neutral display', () => {
    const store = new PlayerDisplayStore();

    expect(store.state()).toEqual({ mode: 'neutral' });
  });

  it('replaces the complete display state', () => {
    const store = new PlayerDisplayStore();

    store.setState({
      mode: 'location',
      locationId: 'demo-tavern',
      imagePath: '/demo/tavern.svg',
      name: "Beholder's Inn",
    });

    expect(store.state()).toEqual({
      mode: 'location',
      locationId: 'demo-tavern',
      imagePath: '/demo/tavern.svg',
      name: "Beholder's Inn",
    });
  });

  it('returns to neutral from another mode', () => {
    const store = new PlayerDisplayStore();
    store.setState({
      mode: 'npc',
      npcId: 'demo-innkeeper',
      name: 'Mira Vell',
      portraitPath: '/demo/innkeeper.svg',
    });

    store.showNeutral();

    expect(store.state()).toEqual({ mode: 'neutral' });
  });
});
