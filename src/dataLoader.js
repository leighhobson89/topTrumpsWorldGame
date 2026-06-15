export async function loadCountries() {
  const response = await fetch("./dataset/countryTerritoriesData.json");

  if (!response.ok) {
    throw new Error(`Failed to load dataset: ${response.status}`);
  }

  const countries = await response.json();
  return countries.map((country) => ({
    country: country.country,
    territories: country.territories.map((territory, index) => ({
      id: buildTerritoryId(country.country, territory.name),
      index,
      name: territory.name,
      country: territory.country,
      stats: {
        ECON_RANK: territory.ECON_RANK,
        POP_RANK: territory.POP_RANK,
        MIL_RANK: territory.MIL_RANK,
        TECH_RANK: territory.TECH_RANK,
        STB_RANK: territory.STB_RANK,
        AREA_RANK: territory.AREA_RANK,
      },
    })),
  }));
}

export function buildTerritoryId(countryName, territoryName) {
  return `${countryName}__${territoryName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
