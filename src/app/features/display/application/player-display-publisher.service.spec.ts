import { TestBed } from '@angular/core/testing';

import { PlayerDisplayPublisher } from '@app/features/display/application/player-display-publisher.service';
import { PlayerDisplayStore } from '@app/features/display/application/player-display.store';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import type {
  PlayerDisplayState,
  PlayerDisplayStateOf,
} from '@app/features/display/domain/player-display-state';
import { ActiveSceneService } from '@app/features/scenes/application/active-scene.service';

describe('PlayerDisplayPublisher', () => {
  const tavern: PlayerDisplayState = {
    mode: 'location',
    locationId: 'tavern',
    imagePath: 'tavern.webp',
    name: 'Taverne',
  };
  const isTavern = (state: PlayerDisplayState): state is PlayerDisplayStateOf<'location'> =>
    state.mode === 'location' && state.locationId === 'tavern';
  const gateway = {
    isDesktop: true,
    isPlayerDisplayOpen: vi.fn(),
    sendPlayerDisplayState: vi.fn(),
  };
  const activeScene = { clear: vi.fn() };
  let publisher: PlayerDisplayPublisher;
  let store: PlayerDisplayStore;

  beforeEach(() => {
    vi.clearAllMocks();
    gateway.isDesktop = true;
    gateway.isPlayerDisplayOpen.mockResolvedValue(true);
    gateway.sendPlayerDisplayState.mockResolvedValue(undefined);
    activeScene.clear.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: DisplayGateway, useValue: gateway },
        { provide: ActiveSceneService, useValue: activeScene },
      ],
    });
    publisher = TestBed.inject(PlayerDisplayPublisher);
    store = TestBed.inject(PlayerDisplayStore);
  });

  it('reports the player window as closed outside the desktop shell', async () => {
    gateway.isDesktop = false;

    await expect(publisher.isOpen()).resolves.toBe(false);
    expect(gateway.isPlayerDisplayOpen).not.toHaveBeenCalled();
  });

  it('shows a standalone resource after leaving the active scene', async () => {
    await publisher.toggle('campaign-id', isTavern, () => tavern);

    expect(activeScene.clear).toHaveBeenCalledWith('campaign-id');
    expect(store.state()).toEqual(tavern);
    expect(gateway.sendPlayerDisplayState).toHaveBeenCalledWith(tavern);
  });

  it('returns to the neutral screen when the resource is already shown', async () => {
    store.setState(tavern);
    const build = vi.fn();

    await publisher.toggle('campaign-id', isTavern, build);

    expect(build).not.toHaveBeenCalled();
    expect(store.state()).toEqual({ mode: 'neutral' });
    expect(gateway.sendPlayerDisplayState).toHaveBeenCalledWith({ mode: 'neutral' });
  });

  it('withdraws only the resource currently shown', async () => {
    await publisher.withdraw(isTavern, true);
    expect(gateway.sendPlayerDisplayState).not.toHaveBeenCalled();

    store.setState(tavern);
    await publisher.withdraw(isTavern, true);
    expect(store.state()).toEqual({ mode: 'neutral' });
    expect(gateway.sendPlayerDisplayState).toHaveBeenCalledWith({ mode: 'neutral' });
  });

  it('keeps the shared state up to date without sending to a closed window', async () => {
    store.setState(tavern);

    await publisher.refresh(isTavern, (current) => ({ ...current, name: undefined }), false);

    expect(store.state()).toEqual({ ...tavern, name: undefined });
    expect(gateway.sendPlayerDisplayState).not.toHaveBeenCalled();
  });

  it('ignores a refresh when another resource is shown', async () => {
    const next = vi.fn();

    await publisher.refresh(isTavern, next, true);

    expect(next).not.toHaveBeenCalled();
    expect(store.state()).toEqual({ mode: 'neutral' });
  });
});
