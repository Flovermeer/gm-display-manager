import { TestBed } from '@angular/core/testing';

import { AppSettingRepository } from '@app/core/persistence/app-setting.repository';
import { InMemoryAppSettingRepository } from '@app/core/persistence/in-memory-app-setting.repository';
import { PlayerDisplayStore } from '@app/features/display/application/player-display.store';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import { NpcService } from '@app/features/npcs/application/npc.service';
import { NpcWorkspaceFacade } from '@app/features/npcs/application/npc-workspace.facade';
import { InMemoryNpcRepository } from '@app/features/npcs/data-access/in-memory-npc.repository';
import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';
import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';
import { NpcRepository } from '@app/features/npcs/data-access/npc.repository';
import {
  createEmptyNpcSheet,
  DEMO_NPC_PORTRAIT_URL,
  type UpdateNpcInput,
} from '@app/features/npcs/domain/npc';

describe('NpcWorkspaceFacade', () => {
  const input: UpdateNpcInput = {
    name: 'Mira Vell',
    kind: 'character',
    status: 'active',
    summary: 'Aubergiste',
    notes: '',
    sheet: createEmptyNpcSheet(),
  };
  const portraits = { chooseAndImport: vi.fn(), resolveUrl: vi.fn(), discard: vi.fn() };
  const idleVideos = { chooseAndImport: vi.fn(), resolveUrl: vi.fn(), discard: vi.fn() };
  const displayGateway = {
    isDesktop: true,
    isPlayerDisplayOpen: vi.fn(),
    sendPlayerDisplayState: vi.fn(),
  };
  let facade: NpcWorkspaceFacade;
  let store: PlayerDisplayStore;

  beforeEach(() => {
    vi.clearAllMocks();
    portraits.resolveUrl.mockImplementation(async (path: string) => `asset://${path}`);
    portraits.discard.mockResolvedValue(undefined);
    idleVideos.resolveUrl.mockImplementation(async (path: string) => `asset://${path}`);
    idleVideos.discard.mockResolvedValue(undefined);
    displayGateway.sendPlayerDisplayState.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: NpcRepository, useClass: InMemoryNpcRepository },
        { provide: AppSettingRepository, useClass: InMemoryAppSettingRepository },
        { provide: NpcPortraitGateway, useValue: portraits },
        { provide: NpcIdleVideoGateway, useValue: idleVideos },
        { provide: DisplayGateway, useValue: displayGateway },
      ],
    });
    facade = TestBed.inject(NpcWorkspaceFacade);
    store = TestBed.inject(PlayerDisplayStore);
  });

  it('imports a portrait and removes it when its preview cannot be resolved', async () => {
    portraits.chooseAndImport.mockResolvedValue('draft.webp');

    await expect(facade.importPortrait('universe-id')).resolves.toEqual({
      path: 'draft.webp',
      url: 'asset://draft.webp',
    });

    portraits.resolveUrl.mockRejectedValueOnce(new Error('fichier illisible'));
    await expect(facade.importPortrait('universe-id')).rejects.toThrow('fichier illisible');
    expect(portraits.discard).toHaveBeenCalledWith('draft.webp');
  });

  it('keeps discarding media after a failure and reports every error', async () => {
    portraits.discard.mockRejectedValue(new Error('portrait verrouillé'));

    const errors = await facade.discardMedia({
      portraitPath: 'portrait.webp',
      idleVideoPath: 'idle.webm',
    });

    expect(idleVideos.discard).toHaveBeenCalledWith('idle.webm');
    expect(errors).toEqual([new Error('portrait verrouillé')]);
  });

  it('removes the replaced idle video and refreshes the NPC shown to players', async () => {
    const created = await facade.save({
      campaignId: 'campaign-id',
      existing: null,
      input,
      portraitPath: null,
      idleVideoPath: 'old.webm',
      isPlayerDisplayOpen: true,
    });
    store.setState({
      mode: 'npc',
      npcId: created.id,
      name: 'Mira Vell',
      portraitPath: DEMO_NPC_PORTRAIT_URL,
      idleVideoPath: 'asset://old.webm',
    });

    const updated = await facade.save({
      campaignId: 'campaign-id',
      existing: created,
      input: { ...input, name: 'Mira la Rousse' },
      portraitPath: 'mira.webp',
      idleVideoPath: null,
      isPlayerDisplayOpen: true,
    });

    expect(updated.name).toBe('Mira la Rousse');
    expect(idleVideos.discard).toHaveBeenCalledWith('old.webm');
    expect(displayGateway.sendPlayerDisplayState).toHaveBeenLastCalledWith({
      mode: 'npc',
      npcId: created.id,
      name: 'Mira la Rousse',
      portraitPath: 'asset://mira.webp',
      idleVideoPath: undefined,
    });
  });

  it('removes the replaced portrait of a campaign NPC only', async () => {
    const created = await facade.save({
      campaignId: 'campaign-id',
      existing: null,
      input,
      portraitPath: 'old.webp',
      idleVideoPath: null,
      isPlayerDisplayOpen: false,
    });

    await facade.save({
      campaignId: 'campaign-id',
      existing: created,
      input,
      portraitPath: 'new.webp',
      idleVideoPath: null,
      isPlayerDisplayOpen: false,
    });
    expect(portraits.discard).toHaveBeenCalledWith('old.webp');

    portraits.discard.mockClear();
    await facade.save({
      campaignId: 'campaign-id',
      existing: { ...created, provenance: 'universe', portraitPath: 'canonical.webp' },
      input,
      portraitPath: 'new.webp',
      idleVideoPath: null,
      isPlayerDisplayOpen: false,
    });
    expect(portraits.discard).not.toHaveBeenCalled();
  });

  it('shows an NPC without portrait with the demo portrait', async () => {
    const npc = await facade.save({
      campaignId: 'campaign-id',
      existing: null,
      input,
      portraitPath: null,
      idleVideoPath: null,
      isPlayerDisplayOpen: false,
    });

    await facade.toggleOnPlayerDisplay(npc);

    expect(store.state()).toEqual({
      mode: 'npc',
      npcId: npc.id,
      name: 'Mira Vell',
      portraitPath: DEMO_NPC_PORTRAIT_URL,
    });
  });

  it('deletes a displayed NPC, returns to the neutral screen and reports cleanup errors', async () => {
    const npc = await facade.save({
      campaignId: 'campaign-id',
      existing: null,
      input,
      portraitPath: 'mira.webp',
      idleVideoPath: 'mira.webm',
      isPlayerDisplayOpen: false,
    });
    store.setState({
      mode: 'npc',
      npcId: npc.id,
      name: npc.name,
      portraitPath: 'asset://mira.webp',
    });
    idleVideos.discard.mockRejectedValue(new Error('vidéo verrouillée'));

    const errors = await facade.delete(npc, true);

    expect(store.state()).toEqual({ mode: 'neutral' });
    expect(displayGateway.sendPlayerDisplayState).toHaveBeenCalledWith({ mode: 'neutral' });
    await expect(TestBed.inject(NpcService).list('campaign-id')).resolves.toEqual([]);
    expect(portraits.discard).toHaveBeenCalledWith('mira.webp');
    expect(errors).toEqual([new Error('vidéo verrouillée')]);
  });
});
