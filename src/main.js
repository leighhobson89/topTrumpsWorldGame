import { loadCountries } from "./dataLoader.js";
import { createGame, resolveAiTurn, resolvePlayerAttack, selectAttacker, selectTarget, startAttack } from "./gameEngine.js";
import { buildCountryLayout } from "./layout.js";
import { initializeCountrySelect, initializeStatButtons, renderApp } from "./ui.js";
import { PHASES } from "./constants.js";

const elements = {
  countrySelect: document.querySelector("#countrySelect"),
  playerCount: document.querySelector("#playerCount"),
  aiCount: document.querySelector("#aiCount"),
  turnCount: document.querySelector("#turnCount"),
  phaseLabel: document.querySelector("#phaseLabel"),
  statusText: document.querySelector("#statusText"),
  mapTitle: document.querySelector("#mapTitle"),
  mapSvg: document.querySelector("#mapSvg"),
  restartButton: document.querySelector("#restartButton"),
  attackerCard: document.querySelector("#attackerCard"),
  targetCard: document.querySelector("#targetCard"),
  attackButton: document.querySelector("#attackButton"),
  statButtons: document.querySelector("#statButtons"),
  battleLog: document.querySelector("#battleLog"),
  endScreen: document.querySelector("#endScreen"),
  winnerText: document.querySelector("#winnerText"),
  summaryText: document.querySelector("#summaryText"),
  playAgainButton: document.querySelector("#playAgainButton"),
};

let countries = [];
let currentCountry = null;
let state = null;
let layout = [];
let aiTimer = null;

async function boot() {
  try {
    countries = await loadCountries();
    initializeCountrySelect(elements.countrySelect, countries, startCountry);
    initializeStatButtons(elements.statButtons, handleStatClick);
    elements.attackButton.addEventListener("click", handleAttackClick);
    elements.restartButton.addEventListener("click", () => startCountry(currentCountry.country));
    elements.playAgainButton.addEventListener("click", () => startCountry(currentCountry.country));
    startCountry(countries[0].country);
  } catch (error) {
    elements.phaseLabel.textContent = "Dataset error";
    elements.statusText.textContent = error.message;
  }
}

function startCountry(countryName) {
  clearAiTimer();
  currentCountry = countries.find((country) => country.country === countryName);
  state = createGame(currentCountry);
  layout = buildCountryLayout(currentCountry.country, state.territories);
  elements.countrySelect.value = countryName;
  render();
}

function handleTerritoryClick(territoryId) {
  if (state.phase === PHASES.SELECT_ATTACKER) {
    state = selectAttacker(state, territoryId);
  } else if (state.phase === PHASES.SELECT_TARGET) {
    state = selectTarget(state, territoryId);
  }

  render();
}

function handleAttackClick() {
  state = startAttack(state);
  render();
}

function handleStatClick(statKey) {
  state = resolvePlayerAttack(state, statKey);
  render();
  scheduleAiTurn();
}

function scheduleAiTurn() {
  clearAiTimer();

  if (state.phase !== PHASES.AI_TURN) {
    return;
  }

  aiTimer = window.setTimeout(() => {
    state = resolveAiTurn(state);
    render();
  }, 800);
}

function clearAiTimer() {
  if (aiTimer) {
    window.clearTimeout(aiTimer);
    aiTimer = null;
  }
}

function render() {
  renderApp(elements, state, layout, { onTerritoryClick: handleTerritoryClick });
}

boot();
