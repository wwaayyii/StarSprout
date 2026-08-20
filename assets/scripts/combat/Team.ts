import { Enum } from 'cc';

/** Factions shared by all combat participants. */
export enum Team {
    Player = 0,
    Enemy = 1,
    Neutral = 2,
}

Enum(Team);

/**
 * The single faction rule used by combat components.
 * Members of the same faction cannot damage each other by default.
 */
export function canDamageTeam(attacker: Team, target: Team): boolean {
    return attacker !== target;
}
