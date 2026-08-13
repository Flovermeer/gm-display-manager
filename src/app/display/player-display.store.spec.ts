import { PlayerDisplayStore } from '@app/display/player-display.store';

describe('PlayerDisplayStore', () => {
  it('starts with a blank display', () => {
    const store = new PlayerDisplayStore();

    expect(store.state()).toEqual({ mode: 'blank' });
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

  it('returns to blank from another mode', () => {
    const store = new PlayerDisplayStore();
    store.setState({
      mode: 'npc',
      npcId: 'demo-innkeeper',
      name: 'Mira Vell',
      portraitPath: '/demo/innkeeper.svg',
    });

    store.showBlank();

    expect(store.state()).toEqual({ mode: 'blank' });
  });
});
