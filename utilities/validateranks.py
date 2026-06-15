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
# LOAD
# -----------------------------
def load_data():
    with open("output.json", "r", encoding="utf-8") as f:
        return json.load(f)

# -----------------------------
# FLATTEN
# -----------------------------
def flatten(data):
    items = []
    for c in data:
        for t in c["territories"]:
            t["_country"] = c["country"]
            items.append(t)
    return items

# -----------------------------
# CHECK VALIDITY
# -----------------------------
def validate(items):
    errors = {}

    n = len(items)
    expected_set = set(range(1, n + 1))

    for stat in STATS:
        values = [i[stat] for i in items]

        counts = defaultdict(list)
        for item in items:
            counts[item[stat]].append(item["name"])

        duplicates = {k: v for k, v in counts.items() if len(v) > 1}
        used_set = set(values)

        missing = expected_set - used_set
        extra = used_set - expected_set  # ranks outside valid range

        if duplicates or missing or extra:
            errors[stat] = {
                "duplicates": duplicates,
                "missing": sorted(list(missing)),
                "invalid": sorted(list(extra))
            }

    return errors

# -----------------------------
# PRINT ERRORS
# -----------------------------
def print_errors(errors):
    print("\n🚨 VALIDATION ERRORS FOUND:\n")

    for stat, info in errors.items():
        print(f"--- {stat} ---")

        if info["duplicates"]:
            print("Duplicates:")
            for r, names in info["duplicates"].items():
                print(f"  Rank {r}: {', '.join(names)}")

        if info["missing"]:
            print(f"Missing ranks: {info['missing']}")

        if info["invalid"]:
            print(f"Invalid ranks (out of range): {info['invalid']}")

        print()

# -----------------------------
# FIX
# -----------------------------
def fix(items):
    for stat in STATS:
        # sort by current rank then name for stability
        items.sort(key=lambda x: (x[stat], x["name"]))

        for i, item in enumerate(items, start=1):
            item[stat] = i

# -----------------------------
# REBUILD
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

    while True:
        errors = validate(items)

        if not errors:
            print("\n✅ Dataset fully valid. No conflicts.\n")
            break

        print_errors(errors)

        ans = input("Auto-fix and recheck? (y/n): ").strip().lower()
        if ans != "y":
            print("Stopped without changes.")
            return

        fix(items)
        print("\n🔧 Fixed. Revalidating...\n")

    cleaned = rebuild(items)

    with open("output_clean.json", "w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=2, ensure_ascii=False)

    print("💾 Saved: output_clean.json")

if __name__ == "__main__":
    run()