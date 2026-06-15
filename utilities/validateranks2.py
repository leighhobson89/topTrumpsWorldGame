import json
from collections import defaultdict

STATS = [
    "ECON_RANK",
    "POP_RANK",
    "MIL_RANK",
    "TECH_RANK",
    "STB_RANK",
    "AREA_RANK"
]

# -----------------------------
# LOAD DATA
# -----------------------------
def load_data(path="output.json"):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

# -----------------------------
# FLATTEN STRUCTURE
# -----------------------------
def flatten(data):
    items = []
    for country_block in data:
        for t in country_block["territories"]:
            t["_country"] = country_block["country"]
            items.append(t)
    return items

# -----------------------------
# STRICT VALIDATION
# -----------------------------
def validate(items):
    n = len(items)
    expected = set(range(1, n + 1))

    errors = {}

    for stat in STATS:
        values = [i[stat] for i in items]

        value_set = set(values)

        # duplicates detection
        counts = defaultdict(list)
        for i in items:
            counts[i[stat]].append(i["name"])

        duplicates = {k: v for k, v in counts.items() if len(v) > 1}

        missing = expected - value_set
        invalid = value_set - expected

        if duplicates or missing or invalid:
            errors[stat] = {
                "duplicates": duplicates,
                "missing": sorted(list(missing)),
                "invalid": sorted(list(invalid))
            }

    return errors

# -----------------------------
# PRINT ERRORS CLEANLY
# -----------------------------
def print_errors(errors, total):
    print(f"\n🚨 VALIDATION FAILED (expected ranks 1 → {total})\n")

    for stat, info in errors.items():
        print(f"--- {stat} ---")

        if info["duplicates"]:
            print("Duplicates:")
            for rank, names in info["duplicates"].items():
                print(f"  Rank {rank}: {', '.join(names)}")

        if info["missing"]:
            print(f"Missing ranks: {info['missing']}")

        if info["invalid"]:
            print(f"Out-of-range ranks: {info['invalid']}")

        print()

# -----------------------------
# OPTIONAL AUTO-FIX (SAFE REBUILD)
# -----------------------------
def fix(items):
    for stat in STATS:
        # deterministic reorder
        items.sort(key=lambda x: (x[stat], x["name"]))

        for i, item in enumerate(items, start=1):
            item[stat] = i

# -----------------------------
# REBUILD STRUCTURE
# -----------------------------
def rebuild(items):
    from collections import defaultdict

    grouped = defaultdict(list)

    for i in items:
        country = i["_country"]
        clean = dict(i)
        del clean["_country"]
        grouped[country].append(clean)

    return [{"country": k, "territories": v} for k, v in grouped.items()]

# -----------------------------
# MAIN LOOP
# -----------------------------
def run():
    data = load_data()
    items = flatten(data)

    total = len(items)

    while True:
        errors = validate(items)

        if not errors:
            print(f"\n✅ VALID DATASET: All stats are perfect permutations of 1 → {total}\n")
            break

        print_errors(errors, total)

        choice = input("Auto-fix and revalidate? (y/n): ").strip().lower()

        if choice != "y":
            print("Stopped without changes.")
            return

        fix(items)
        print("\n🔧 Fixed. Rechecking...\n")

    cleaned = rebuild(items)

    with open("output_clean.json", "w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=2, ensure_ascii=False)

    print("💾 Saved → output_clean.json")

if __name__ == "__main__":
    run()