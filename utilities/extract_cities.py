import json
import sys

def extract_city_names(data):
    names = []

    for country in data:
        for t in country.get("territories", []):
            name = t.get("name")
            if name:
                names.append(name)

    return names


def main():
    # read file name from command line
    if len(sys.argv) < 2:
        print("Usage: python script.py input.json")
        return

    input_file = sys.argv[1]

    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, dict):
        data = [data]

    names = extract_city_names(data)

    print(", ".join(names))


if __name__ == "__main__":
    main()