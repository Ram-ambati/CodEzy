import re
from pathlib import Path

CSS_FILE = r"C:\Users\ambat\Desktop\CodEzy\css\learn.css"
UNUSED_FILE = r"unused_classes.txt"
OUTPUT_FILE = r"C:\Users\ambat\Desktop\CodEzy\css\learn_clean.css"

# regex to capture selectors with opening brace
block_pattern = re.compile(r'([^{}]+)\{([^}]*)\}', re.DOTALL)

# find any .className inside a selector (before '{')
selector_class_pattern = re.compile(r'\.([A-Za-z0-9_-]+)')


def load_unused():
    try:
        return set(Path(UNUSED_FILE).read_text(encoding="utf-8").split())
    except:
        return set()


def clean_css():
    css_content = Path(CSS_FILE).read_text(encoding="utf-8", errors="replace")
    unused = load_unused()

    cleaned_blocks = []
    last_end = 0

    for match in block_pattern.finditer(css_content):
        selector_text, body = match.group(1).strip(), match.group(2)
        start, end = match.span()

        # Append any text outside blocks (comments, @import, etc.)
        cleaned_blocks.append(css_content[last_end:start])

        selectors = [s.strip() for s in selector_text.split(",")]

        keep_selectors = []

        for sel in selectors:
            # extract class names used in selector
            found_classes = selector_class_pattern.findall(sel)

            # no classes → leave it (e.g. tag selectors, @media, animations)
            if not found_classes:
                keep_selectors.append(sel)
                continue

            # if ANY class in selector is NOT unused → keep
            if any(c not in unused for c in found_classes):
                keep_selectors.append(sel)

        # if at least one selector stays, keep the block
        if keep_selectors:
            cleaned_block = ", ".join(keep_selectors) + " {\n" + body + "}\n"
            cleaned_blocks.append(cleaned_block)

        # else drop block entirely

        last_end = end

    # append remaining CSS (bottom part)
    cleaned_blocks.append(css_content[last_end:])

    Path(OUTPUT_FILE).write_text("".join(cleaned_blocks), encoding="utf-8")
    print("✔ CLEAN CSS CREATED:", OUTPUT_FILE)


if __name__ == "__main__":
    clean_css()
