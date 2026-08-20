import type { Monster } from '@app/features/bestiary/domain/monster';
import type { CombatantSource } from '@app/features/combat/domain/combat';
import type { Npc } from '@app/features/npcs/domain/npc';
import type { PlayerCharacter } from '@app/features/players/domain/player-character';

export function playerCharacterCombatantSource(character: PlayerCharacter): CombatantSource {
  return {
    kind: 'player-character',
    resourceId: character.id,
    name: character.name,
    currentHitPoints: character.currentHitPoints,
    maxHitPoints: character.maxHitPoints,
  };
}

export function npcCombatantSource(npc: Npc): CombatantSource {
  return {
    kind: 'npc',
    resourceId: npc.id,
    name: npc.name,
    currentHitPoints: npc.sheet.hitPoints,
    maxHitPoints: npc.sheet.hitPoints,
  };
}

export function monsterCombatantSource(monster: Monster): CombatantSource {
  return {
    kind: 'monster',
    resourceId: monster.id,
    name: monster.name,
    currentHitPoints: monster.sheet.hitPoints,
    maxHitPoints: monster.sheet.hitPoints,
  };
}
