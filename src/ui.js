import { OWNERS, PHASES, STATS } from "./constants.js";
import { canAttack, getCounts, getTerritory } from "./gameEngine.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export function initializeCountrySelect(select, countries, onCountryChange) {
  select.innerHTML = countries
    .map((country) => `<option value="${escapeHtml(country.country)}">${escapeHtml(country.country)}</option>`)
    .join("");
  select.addEventListener("change", () => onCountryChange(select.value));
}

export function initializeStatButtons(container, onStatClick) {
  container.replaceChildren(
    ...STATS.map((stat) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.stat = stat.key;
      button.textContent = stat.label;
      button.title = `${stat.description}. Lower rank wins.`;
      button.addEventListener("click", () => onStatClick(stat.key));
      return button;
    }),
  );
}

export function renderApp(elements, state, layout, actions) {
  renderTopBar(elements, state);
  renderStatus(elements, state);
  renderMap(elements.mapSvg, state, layout, actions.onTerritoryClick);
  renderCards(elements, state);
  renderBattleLog(elements.battleLog, state.log);
  renderEndScreen(elements, state);
}

function renderTopBar(elements, state) {
  const counts = getCounts(state);
  elements.playerCount.textContent = counts[OWNERS.PLAYER];
  elements.aiCount.textContent = counts[OWNERS.AI];
  elements.turnCount.textContent = state.turnsTaken;
  elements.mapTitle.textContent = `${state.country} territories`;
}

function renderStatus(elements, state) {
  const phaseCopy = {
    [PHASES.SELECT_ATTACKER]: ["Player turn", "Select a blue territory with no cooldown."],
    [PHASES.SELECT_TARGET]: ["Choose target", "Select a red AI territory to attack."],
    [PHASES.SELECT_STAT]: ["Choose stat", "Pick the rank category for your attack."],
    [PHASES.AI_TURN]: ["AI turn", "AI is choosing an attack."],
    [PHASES.GAME_OVER]: ["Game over", "Start again or choose another country."],
  };
  const [label, text] = phaseCopy[state.phase];
  elements.phaseLabel.textContent = label;
  elements.statusText.textContent = text;
}

function renderMap(mapSvg, state, layout, onTerritoryClick) {
  mapSvg.replaceChildren();

  for (const territory of state.territories) {
    const position = layout.find((node) => node.id === territory.id);
    const group = document.createElementNS(SVG_NS, "g");
    const isSelected =
      territory.id === state.selectedAttackerId || territory.id === state.selectedTargetId;
    const isValidTarget = state.phase === PHASES.SELECT_TARGET && territory.owner === OWNERS.AI;
    const classes = [
      "territory-node",
      territory.owner === OWNERS.PLAYER ? "player" : "ai",
      isSelected ? "selected" : "",
      isValidTarget ? "valid-target" : "",
      territory.cooldown > 0 ? "cooldown" : "",
    ]
      .filter(Boolean)
      .join(" ");

    group.setAttribute("class", classes);
    group.setAttribute("transform", `translate(${position.x} ${position.y})`);
    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "button");
    group.setAttribute("aria-label", `${territory.name}, ${territory.owner}`);
    group.addEventListener("click", () => onTerritoryClick(territory.id));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        onTerritoryClick(territory.id);
      }
    });

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("r", "32");
    group.append(circle);

    const title = document.createElementNS(SVG_NS, "title");
    title.textContent = `${territory.name} • ${territory.owner}${territory.cooldown ? ` • cooldown ${territory.cooldown}` : ""}`;
    group.append(title);

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("class", "territory-label");
    label.setAttribute("y", "55");
    label.textContent = shortLabel(territory.name);
    group.append(label);

    if (territory.cooldown > 0) {
      const cooldownLabel = document.createElementNS(SVG_NS, "text");
      cooldownLabel.setAttribute("class", "cooldown-label");
      cooldownLabel.setAttribute("y", "5");
      cooldownLabel.textContent = territory.cooldown;
      group.append(cooldownLabel);
    }

    mapSvg.append(group);
  }
}

function renderCards(elements, state) {
  const attacker = getTerritory(state, state.selectedAttackerId);
  const target = getTerritory(state, state.selectedTargetId);

  elements.attackerCard.className = attacker ? "" : "empty-card";
  elements.attackerCard.innerHTML = attacker
    ? territoryCard(attacker, { revealStats: true })
    : "Select a blue territory.";

  elements.targetCard.className = target ? "" : "empty-card";
  elements.targetCard.innerHTML = target
    ? territoryCard(target, { revealStats: state.lastBattle?.targetId === target.id })
    : "Press Attack, then select a red territory.";

  const attackReady = state.phase === PHASES.SELECT_ATTACKER && canAttack(attacker);
  elements.attackButton.disabled = !attackReady;

  for (const button of elements.statButtons.querySelectorAll("button")) {
    button.disabled = state.phase !== PHASES.SELECT_STAT;
  }
}

function territoryCard(territory, { revealStats }) {
  const statRows = revealStats
    ? STATS.map(
        (stat) => `
          <div class="stat-row">
            <span>${stat.label}</span>
            <strong>${territory.stats[stat.key]}</strong>
          </div>
        `,
      ).join("")
    : STATS.map(
        (stat) => `
          <div class="stat-row">
            <span>${stat.label}</span>
            <strong>?</strong>
          </div>
        `,
      ).join("");

  const ownerClass = territory.owner === OWNERS.PLAYER ? "player" : "ai";

  return `
    <article class="territory-card">
      <h3>${escapeHtml(territory.name)}</h3>
      <span class="owner-pill ${ownerClass}">${territory.owner}</span>
      <p class="empty-card">Cooldown: ${territory.cooldown}</p>
      <div class="stats-grid">${statRows}</div>
    </article>
  `;
}

function renderBattleLog(battleLog, logEntries) {
  battleLog.innerHTML = logEntries
    .slice(0, 40)
    .map((entry) => `<li>${emphasizeOwners(escapeHtml(entry))}</li>`)
    .join("");
}

function renderEndScreen(elements, state) {
  const gameOver = state.phase === PHASES.GAME_OVER;
  elements.endScreen.hidden = !gameOver;

  if (!gameOver) {
    return;
  }

  elements.winnerText.textContent = state.winner === OWNERS.PLAYER ? "Player wins" : "AI wins";
  elements.summaryText.textContent = `${state.country} conquered in ${state.turnsTaken} turns. Player captures: ${state.playerCaptures}. AI captures: ${state.aiCaptures}.`;
}

function emphasizeOwners(value) {
  return value
    .replaceAll("PLAYER", "<strong>PLAYER</strong>")
    .replaceAll("AI", "<strong>AI</strong>");
}

function shortLabel(name) {
  const parts = name.split(/\s+/);
  if (name.length <= 12) {
    return name;
  }
  return parts.length > 1 ? parts.map((part) => part[0]).join("").slice(0, 4) : name.slice(0, 4);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
