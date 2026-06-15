import json
import math
import random
from collections import defaultdict

# -----------------------------
# Reproducibility seed
# -----------------------------
random.seed(42)

# -----------------------------
# COUNTRY BASE PROFILES
# (approximate real-world anchoring)
# scale: 0–100
# -----------------------------
COUNTRY_PROFILE = {
    "United States": {"econ": 95, "mil": 95, "tech": 95, "stb": 80, "area": 95},
    "China": {"econ": 93, "mil": 90, "tech": 92, "stb": 75, "area": 90},
    "India": {"econ": 80, "mil": 75, "tech": 78, "stb": 65, "area": 85},
    "Brazil": {"econ": 75, "mil": 70, "tech": 72, "stb": 60, "area": 80},
    "Russia": {"econ": 78, "mil": 96, "tech": 85, "stb": 55, "area": 98},
    "Germany": {"econ": 90, "mil": 75, "tech": 92, "stb": 90, "area": 60},
    "France": {"econ": 88, "mil": 80, "tech": 88, "stb": 88, "area": 65},
    "UK": {"econ": 89, "mil": 85, "tech": 90, "stb": 85, "area": 50},
    "Japan": {"econ": 92, "mil": 80, "tech": 96, "stb": 92, "area": 55},
    "South Korea": {"econ": 88, "mil": 78, "tech": 97, "stb": 85, "area": 45},
    "default": {"econ": 65, "mil": 60, "tech": 60, "stb": 60, "area": 60},
}

# -----------------------------
# CITY IMPORTANCE DETECTOR
# -----------------------------
def city_modifier(name: str):
    n = name.lower()

    if any(x in n for x in ["new york", "tokyo", "london", "beijing", "shanghai"]):
        return 1.35
    if any(x in n for x in ["capital", "washington", "delhi", "brasília", "moscow"]):
        return 1.25
    if any(x in n for x in ["los angeles", "mumbai", "são paulo", "mexico city", "paris"]):
        return 1.20
    if any(x in n for x in ["shenzhen", "bangalore", "berlin", "toronto", "dubai"]):
        return 1.15
    if any(x in n for x in ["rio", "chicago", "sydney", "milan", "barcelona"]):
        return 1.10

    # fallback noise
    return random.uniform(0.85, 1.05)

# -----------------------------
# SAFE SCORE GENERATOR
# -----------------------------
def clamp(x, lo=1, hi=100):
    return max(lo, min(hi, x))

def generate_scores(country, city):
    base = COUNTRY_PROFILE.get(country, COUNTRY_PROFILE["default"])
    mod = city_modifier(city)

    # controlled noise (prevents identical cities)
    noise = lambda: random.uniform(0.92, 1.08)

    econ = clamp(base["econ"] * mod * noise())
    mil  = clamp(base["mil"]  * (1.0 + (0.05 if "capital" in city.lower() else 0)) * noise())
    tech = clamp(base["tech"] * mod * noise())
    stb  = clamp(base["stb"]  * noise())
    area = clamp(base["area"] * (1.1 if "los angeles" in city.lower() or "houston" in city.lower() else 1.0) * noise())

    pop  = clamp((econ * 0.4 + tech * 0.3 + base["econ"] * 0.3) * noise())

    return {
        "ECON": econ,
        "POP": pop,
        "MIL": mil,
        "TECH": tech,
        "STB": stb,
        "AREA": area
    }

# -----------------------------
# MAIN PROCESSOR
# -----------------------------
def process(data):
    all_cities = []

    # Step 1: generate scores
    for country_block in data:
        country = country_block["country"]

        for city in country_block["territories"]:
            scores = generate_scores(country, city["name"])

            city.update(scores)
            city["country"] = country

            all_cities.append(city)

    # Step 2: convert each stat to global ranks
    def rank_field(field):
        sorted_cities = sorted(all_cities, key=lambda x: x[field], reverse=True)

        for i, c in enumerate(sorted_cities, start=1):
            c[f"{field}_RANK"] = i

    for field in ["ECON", "POP", "MIL", "TECH", "STB", "AREA"]:
        rank_field(field)

    # Step 3: clean temporary score fields
    for c in all_cities:
        for k in ["ECON", "POP", "MIL", "TECH", "STB", "AREA"]:
            del c[k]

    # Step 4: rebuild structure
    grouped = defaultdict(list)
    for c in all_cities:
        grouped[c["country"]].append(c)

    output = []
    for country, cities in grouped.items():
        output.append({
            "country": country,
            "territories": cities
        })

    return output

# -----------------------------
# RUN SCRIPT
# -----------------------------
if __name__ == "__main__":
    with open("input.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    output = process(data)

    with open("output.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print("Done → output.json generated")