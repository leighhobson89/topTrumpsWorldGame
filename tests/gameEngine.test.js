import assert from "node:assert/strict";
import test from "node:test";
import { OWNERS, PHASES } from "../src/constants.js";
import {
  createGame,
  getCounts,
  resolveAiTurn,
  resolvePlayerAttack,
  selectAttacker,
  selectTarget,
  startAttack,
} from "../src/gameEngine.js";

const countryData = {
  country: "Testland",
  territories: Array.from({ length: 30 }, (_, index) => ({
    id: `territory-${index}`,
    index,
    name: `Territory ${index}`,
    country: "Testland",
    stats: {
      ECON_RANK: index + 1,
      POP_RANK: index + 10,
      MIL_RANK: index + 20,
      TECH_RANK: index + 30,
      STB_RANK: index + 40,
      AREA_RANK: index + 50,
    },
  })),
};

test("createGame assigns every territory to either player or the single AI", () => {
  const state = createGame(countryData);
  const counts = getCounts(state);

  assert.equal(counts[OWNERS.PLAYER], 15);
  assert.equal(counts[OWNERS.AI], 15);
  assert.equal(counts[OWNERS.PLAYER] + counts[OWNERS.AI], 30);
});

test("player attack captures the selected AI target when lower rank wins", () => {
  let state = createGame(countryData);
  const attacker = state.territories.find((territory) => territory.owner === OWNERS.PLAYER);
  const target = state.territories.find((territory) => territory.owner === OWNERS.AI);

  state = selectAttacker(state, attacker.id);
  state = startAttack(state);
  state = selectTarget(state, target.id);
  state = resolvePlayerAttack(state, "ECON_RANK");

  const captured = state.territories.find((territory) => territory.id === target.id);
  assert.equal(captured.owner, OWNERS.PLAYER);
  assert.equal(state.playerCaptures, 1);
});

test("AI turn returns control to player after resolving a battle", () => {
  let state = createGame(countryData);
  const attacker = state.territories.find((territory) => territory.owner === OWNERS.PLAYER);
  const target = state.territories.find((territory) => territory.owner === OWNERS.AI);

  state = resolvePlayerAttack(selectTarget(startAttack(selectAttacker(state, attacker.id)), target.id), "ECON_RANK");
  assert.equal(state.phase, PHASES.AI_TURN);

  state = resolveAiTurn(state);
  assert.equal(state.phase, PHASES.SELECT_ATTACKER);
  assert.equal(state.turnsTaken, 2);
});
