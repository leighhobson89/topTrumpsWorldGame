function hashString(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed, salt) {
  const mixed = hashString(`${seed}:${salt}`);
  return (mixed % 10000) / 10000;
}

export function buildCountryLayout(countryName, territories) {
  const columns = Math.ceil(Math.sqrt(territories.length * 1.25));
  const rows = Math.ceil(territories.length / columns);
  const cellWidth = 860 / columns;
  const cellHeight = 560 / rows;

  return territories.map((territory, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const jitterX = (seededUnit(countryName, territory.name) - 0.5) * cellWidth * 0.44;
    const jitterY = (seededUnit(territory.name, countryName) - 0.5) * cellHeight * 0.44;

    return {
      id: territory.id,
      x: 70 + column * cellWidth + cellWidth / 2 + jitterX,
      y: 70 + row * cellHeight + cellHeight / 2 + jitterY,
    };
  });
}
