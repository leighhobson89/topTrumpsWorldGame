import { COOLDOWN_TURNS, OWNERS, PHASES, STATS } from "./constants.js";

export function createGame(countryData) {
  const midpoint = Math.ceil(countryData.territories.length / 2);
  const territories = countryData.territories.map((territory, index) => ({
    ...territory,
    owner: index % 2 === 0 && index / 2 < midpoint / 2 ? OWNERS.PLAYER : OWNERS.AI,
    cooldown: 0,
  }));

  rebalanceOpeningControl(territories);

  const counts = territories.reduce(
    (control, territory) => {
      control[territory.owner] += 1;
      return control;
    },
    { [OWNERS.PLAYER]: 0, [OWNERS.AI]: 0 },
  );

  return {
    country: countryData.country,
    territories,
    selectedAttackerId: null,
    selectedTargetId: null,
    phase: PHASES.SELECT_ATTACKER,
    turnsTaken: 0,
    playerCaptures: 0,
    aiCaptures: 0,
    winner: null,
    log: [
      `${countryData.country} loaded. Player controls ${counts[OWNERS.PLAYER]} territories; the single AI controls ${counts[OWNERS.AI]}.`,
    ],
    lastBattle: null,
  };
}

export function selectAttacker(state, territoryId) {
  const territory = getTerritory(state, territoryId);

  if (state.phase !== PHASES.SELECT_ATTACKER || !canAttack(territory)) {
    return state;
  }

  return {
    ...state,
    selectedAttackerId: territoryId,
    selectedTargetId: null,
    phase: PHASES.SELECT_ATTACKER,
  };
}

export function startAttack(state) {
  const attacker = getTerritory(state, state.selectedAttackerId);

  if (state.phase !== PHASES.SELECT_ATTACKER || !canAttack(attacker)) {
    return state;
  }

  return {
    ...state,
    phase: PHASES.SELECT_TARGET,
    log: [`${attacker.name} is ready. Select a red AI territory to attack.`, ...state.log],
  };
}

export function selectTarget(state, territoryId) {
  const territory = getTerritory(state, territoryId);

  if (state.phase !== PHASES.SELECT_TARGET || !territory || territory.owner !== OWNERS.AI) {
    return state;
  }

  return {
    ...state,
    selectedTargetId: territoryId,
    phase: PHASES.SELECT_STAT,
    log: [`Target locked: ${territory.name}. Choose an attack stat.`, ...state.log],
  };
}

export function resolvePlayerAttack(state, statKey) {
  if (state.phase !== PHASES.SELECT_STAT) {
    return state;
  }

  const attacker = getTerritory(state, state.selectedAttackerId);
  const target = getTerritory(state, state.selectedTargetId);

  if (!canAttack(attacker) || !target || target.owner !== OWNERS.AI || !isStat(statKey)) {
    return state;
  }

  const defenderChoice = chooseAiDefender(state, target, statKey);
  const battle = resolveBattle({
    attacker,
    defender: defenderChoice.defender,
    target,
    attackerOwner: OWNERS.PLAYER,
    attackerStatKey: statKey,
    defenderStatKey: defenderChoice.statKey,
  });

  const territories = applyBattleResult(state.territories, battle);
  const nextState = {
    ...state,
    territories,
    selectedAttackerId: null,
    selectedTargetId: null,
    turnsTaken: state.turnsTaken + 1,
    playerCaptures: state.playerCaptures + (battle.attackerWon ? 1 : 0),
    phase: PHASES.AI_TURN,
    lastBattle: battle,
    log: [formatBattleLog(battle), ...state.log],
  };

  return evaluateEndState(nextState);
}

export function resolveAiTurn(state) {
  if (state.phase !== PHASES.AI_TURN) {
    return state;
  }

  const choice = chooseAiAttack(state);

  if (!choice) {
    return {
      ...state,
      phase: PHASES.SELECT_ATTACKER,
      log: ["AI has no available attackers this turn.", ...state.log],
    };
  }

  const battle = resolveBattle({
    attacker: choice.attacker,
    defender: choice.target,
    target: choice.target,
    attackerOwner: OWNERS.AI,
    attackerStatKey: choice.statKey,
    defenderStatKey: choice.defenderStatKey,
  });

  const territories = applyBattleResult(state.territories, battle);
  const nextState = {
    ...state,
    territories,
    selectedAttackerId: null,
    selectedTargetId: null,
    turnsTaken: state.turnsTaken + 1,
    aiCaptures: state.aiCaptures + (battle.attackerWon ? 1 : 0),
    phase: PHASES.SELECT_ATTACKER,
    lastBattle: battle,
    log: [formatBattleLog(battle), ...state.log],
  };

  return evaluateEndState(nextState);
}

export function getCounts(state) {
  return state.territories.reduce(
    (counts, territory) => {
      counts[territory.owner] += 1;
      return counts;
    },
    { [OWNERS.PLAYER]: 0, [OWNERS.AI]: 0 },
  );
}

export function canAttack(territory) {
  return Boolean(territory && territory.owner === OWNERS.PLAYER && territory.cooldown === 0);
}

export function canAiAttack(territory) {
  return Boolean(territory && territory.owner === OWNERS.AI && territory.cooldown === 0);
}

export function getTerritory(state, territoryId) {
  return state.territories.find((territory) => territory.id === territoryId);
}

function rebalanceOpeningControl(territories) {
  const neededPlayerCount = territories.length / 2;
  let playerCount = territories.filter((territory) => territory.owner === OWNERS.PLAYER).length;

  for (const territory of territories) {
    if (playerCount >= neededPlayerCount) {
      break;
    }

    if (territory.owner === OWNERS.AI) {
      territory.owner = OWNERS.PLAYER;
      playerCount += 1;
    }
  }
}

function chooseAiDefender(state, target, playerStatKey) {
  const counts = getCounts(state);
  const losingBadly = counts[OWNERS.AI] < counts[OWNERS.PLAYER] - 3;
  const eligibleDefenders = state.territories.filter(
    (territory) => territory.owner === OWNERS.AI && territory.cooldown === 0,
  );
  const defenders = eligibleDefenders.length > 0 ? eligibleDefenders : [target];

  if (losingBadly) {
    const defender = minBy(defenders, (territory) => territory.stats[playerStatKey]);
    return { defender, statKey: bestStat(defender, STATS.map((stat) => stat.key)) };
  }

  const highValueDefenders = defenders
    .filter((territory) => territory.stats.ECON_RANK <= target.stats.ECON_RANK)
    .sort((first, second) => strengthScore(first) - strengthScore(second));
  const defender = highValueDefenders[0] ?? minBy(defenders, strengthScore);
  const likelyWinning = defender.stats[playerStatKey] <= target.stats[playerStatKey];

  return {
    defender,
    statKey: likelyWinning
      ? bestStat(defender, [playerStatKey, "MIL_RANK", "TECH_RANK", "STB_RANK"])
      : weightedCounterStat(defender),
  };
}

function chooseAiAttack(state) {
  const attackers = state.territories.filter(canAiAttack);
  const targets = state.territories.filter((territory) => territory.owner === OWNERS.PLAYER);

  if (attackers.length === 0 || targets.length === 0) {
    return null;
  }

  const attacker = minBy(attackers, aiAttackScore);
  const target = maxBy(targets, (territory) => territory.stats.ECON_RANK + weaknessScore(territory));
  const statKey = bestStatAgainst(attacker, target);
  const defenderStatKey = bestStat(target, STATS.map((stat) => stat.key));

  return { attacker, target, statKey, defenderStatKey };
}

function resolveBattle({ attacker, defender, target, attackerOwner, attackerStatKey, defenderStatKey }) {
  const attackerRank = attacker.stats[attackerStatKey];
  const defenderRank = defender.stats[defenderStatKey];
  const attackerWon = attackerRank <= defenderRank;

  return {
    attackerId: attacker.id,
    attackerName: attacker.name,
    defenderId: defender.id,
    defenderName: defender.name,
    targetId: target.id,
    targetName: target.name,
    attackerOwner,
    defenderOwner: attackerOwner === OWNERS.PLAYER ? OWNERS.AI : OWNERS.PLAYER,
    attackerStatKey,
    defenderStatKey,
    attackerRank,
    defenderRank,
    attackerWon,
  };
}

function applyBattleResult(territories, battle) {
  const tickedTerritories = territories.map((territory) => ({
    ...territory,
    cooldown: Math.max(0, territory.cooldown - 1),
  }));

  return tickedTerritories.map((territory) => {
    if (battle.attackerWon && territory.id === battle.targetId) {
      return {
        ...territory,
        owner: battle.attackerOwner,
        cooldown:
          territory.id === battle.attackerId || territory.id === battle.defenderId
            ? COOLDOWN_TURNS
            : territory.cooldown,
      };
    }

    if (territory.id === battle.attackerId || territory.id === battle.defenderId) {
      return { ...territory, cooldown: COOLDOWN_TURNS };
    }

    return territory;
  });
}

function evaluateEndState(state) {
  const counts = getCounts(state);

  if (counts[OWNERS.PLAYER] === state.territories.length) {
    return {
      ...state,
      phase: PHASES.GAME_OVER,
      winner: OWNERS.PLAYER,
      log: ["Player controls every territory.", ...state.log],
    };
  }

  if (counts[OWNERS.AI] === state.territories.length) {
    return {
      ...state,
      phase: PHASES.GAME_OVER,
      winner: OWNERS.AI,
      log: ["AI controls every territory.", ...state.log],
    };
  }

  return state;
}

function formatBattleLog(battle) {
  const result = battle.attackerWon
    ? `${battle.attackerOwner} captured ${battle.targetName}`
    : `${battle.defenderOwner} held ${battle.targetName}`;

  return `${battle.attackerName} ${statLabel(battle.attackerStatKey)} ${battle.attackerRank} vs ${battle.defenderName} ${statLabel(battle.defenderStatKey)} ${battle.defenderRank}. ${result}.`;
}

function bestStat(territory, statKeys) {
  return statKeys.reduce((bestKey, statKey) =>
    territory.stats[statKey] < territory.stats[bestKey] ? statKey : bestKey,
  );
}

function bestStatAgainst(attacker, target) {
  const winningStats = STATS.map((stat) => stat.key).filter(
    (statKey) => attacker.stats[statKey] <= target.stats[statKey],
  );
  return bestStat(attacker, winningStats.length > 0 ? winningStats : STATS.map((stat) => stat.key));
}

function weightedCounterStat(territory) {
  const weights = {
    ECON_RANK: 1,
    POP_RANK: 1,
    MIL_RANK: 0.62,
    TECH_RANK: 0.68,
    STB_RANK: 0.74,
    AREA_RANK: 1,
  };

  return minBy(STATS, (stat) => territory.stats[stat.key] * weights[stat.key]).key;
}

function strengthScore(territory) {
  return STATS.reduce((total, stat) => total + territory.stats[stat.key], 0);
}

function weaknessScore(territory) {
  return STATS.reduce((total, stat) => total + territory.stats[stat.key], 0);
}

function aiAttackScore(territory) {
  return territory.stats.MIL_RANK * 0.9 + territory.stats.TECH_RANK + territory.stats.STB_RANK * 1.1;
}

function statLabel(statKey) {
  return STATS.find((stat) => stat.key === statKey)?.label ?? statKey;
}

function isStat(statKey) {
  return STATS.some((stat) => stat.key === statKey);
}

function minBy(items, score) {
  return items.reduce((best, item) => (score(item) < score(best) ? item : best));
}

function maxBy(items, score) {
  return items.reduce((best, item) => (score(item) > score(best) ? item : best));
}
