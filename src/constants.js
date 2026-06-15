export const OWNERS = Object.freeze({
  PLAYER: "PLAYER",
  AI: "AI",
});

export const PHASES = Object.freeze({
  SELECT_ATTACKER: "SELECT_ATTACKER",
  SELECT_TARGET: "SELECT_TARGET",
  SELECT_STAT: "SELECT_STAT",
  AI_TURN: "AI_TURN",
  GAME_OVER: "GAME_OVER",
});

export const STATS = Object.freeze([
  { key: "ECON_RANK", label: "ECON", description: "Economic strength" },
  { key: "POP_RANK", label: "POP", description: "Population strength" },
  { key: "MIL_RANK", label: "MIL", description: "Military strength" },
  { key: "TECH_RANK", label: "TECH", description: "Technology strength" },
  { key: "STB_RANK", label: "STB", description: "Stability strength" },
  { key: "AREA_RANK", label: "AREA", description: "Area strength" },
]);

export const COOLDOWN_TURNS = 2;
