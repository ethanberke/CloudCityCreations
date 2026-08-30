"""Turn a recipe page into the fields the Contribute form expects.

Two passes, in order of how much a site tells us about itself:

1. `recipe-scrapers`, which carries hand-written parsers for hundreds of recipe
   sites and a schema.org reader for the rest.
2. A schema.org JSON-LD reader of our own, for when that library raises — an
   unsupported host, a signature change, a page whose markup only half matches.

Everything either pass returns goes through the same normalisation, because what
comes back is other people's HTML: entity-escaped, tag-riddled, non-breaking
spaced, and occasionally a single string where a list belongs.
"""

import html as html_module
import json
import re
import unicodedata
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from recipe_scrapers import scrape_html

# Sanity caps. The columns are all TEXT, so these aren't about fitting the
# schema — they keep one malformed page from filling the form (and the grid)
# with a novel's worth of junk the contributor then has to delete by hand.
MAX_NAME_CHARS = 200
MAX_STYLE_CHARS = 60
MAX_INGREDIENT_CHARS = 400
MAX_STEP_CHARS = 2000
MAX_LIST_ITEMS = 120

_STEP_SPLIT = re.compile(r"(?:\r?\n)+")


class NoRecipeFound(Exception):
    """The page fetched fine and simply isn't a recipe we can read."""


def clean_text(value, limit):
    """Flatten one field of foreign HTML into a single trimmed line."""
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)

    # Entities first: sites double-escape often enough that "&amp;frac12;" shows
    # up in ingredient lists, and unescaping before tag-stripping turns an
    # escaped "&lt;p&gt;" into a tag BeautifulSoup can then remove.
    text = html_module.unescape(value)
    if "<" in text:
        text = BeautifulSoup(text, "html.parser").get_text(" ")

    # NFC, not NFKC: the compatibility forms decompose "½ cup" into "1⁄2 cup",
    # and a fraction a contributor recognises is worth more than a canonical
    # one. Non-breaking spaces are handled by the \s collapse below, which
    # matches them in Python's Unicode mode.
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text[:limit].strip()


def _clean_list(values, limit):
    cleaned = []
    for value in values or []:
        text = clean_text(value, limit)
        if text:
            cleaned.append(text)
    return cleaned[:MAX_LIST_ITEMS]


def _try(getter):
    """Call a scraper accessor, treating any failure as "this site doesn't say".

    recipe-scrapers raises a different exception per missing field depending on
    which parser matched — NotImplementedError, its own SchemaOrgException, or
    whatever the page's markup provoked. None of them mean the import failed.
    """
    try:
        return getter()
    except Exception:
        return None


def _pick_style(category, cuisine):
    """One free-text `style`, matching how the column is already used.

    `style` drives the landing page's filter dropdown, where a recipe is one
    option, not two — so category ("Dessert", "Main Dish") wins, since that is
    what the seeded data uses, and cuisine ("Thai") only fills in when the site
    gives no category. Sites list several comma-separated values often enough
    that only the first is kept.
    """
    for value in (category, cuisine):
        if isinstance(value, (list, tuple)):
            value = value[0] if value else None
        text = clean_text(value, MAX_STYLE_CHARS)
        if not text:
            continue
        first = text.split(",")[0].strip()
        # Sites write these in every case there is. Only all-lowercase values
        # get title-cased: doing the same to uppercase ones turns "BBQ" into
        # "Bbq", and style is a filter facet people read.
        if first.islower():
            first = first.title()
        return first[:MAX_STYLE_CHARS]

    return ""


def _absolute(image_url, base_url):
    text = clean_text(image_url, 2000)
    if not text:
        return ""
    absolute = urljoin(base_url, text)
    return absolute if absolute.startswith(("http://", "https://")) else ""


def _from_recipe_scrapers(page_html, url):
    # supported_only=False is what makes this cover sites with no hand-written
    # parser: the library falls back to its own schema.org reader instead of
    # raising WebsiteNotImplementedError.
    scraper = scrape_html(page_html, org_url=url, supported_only=False)

    name = clean_text(_try(scraper.title), MAX_NAME_CHARS)
    ingredients = _clean_list(_try(scraper.ingredients), MAX_INGREDIENT_CHARS)
    instructions = _clean_list(_try(scraper.instructions_list), MAX_STEP_CHARS)

    # instructions_list is the split-per-step accessor; some parsers only
    # implement the newline-joined string behind instructions().
    if not instructions:
        joined = _try(scraper.instructions) or ""
        instructions = _clean_list(_STEP_SPLIT.split(joined), MAX_STEP_CHARS)

    return {
        "recipe_name": name,
        "style": _pick_style(_try(scraper.category), _try(scraper.cuisine)),
        "ingredients": ingredients,
        "instructions": instructions,
        "image_url": _absolute(_try(scraper.image), url),
    }


def _json_ld_nodes(data):
    """Yield every dict in a JSON-LD document, @graph and nesting included."""
    if isinstance(data, dict):
        yield data
        for key in ("@graph", "mainEntity", "mainEntityOfPage", "itemListElement"):
            value = data.get(key)
            if isinstance(value, (dict, list)):
                yield from _json_ld_nodes(value)
    elif isinstance(data, list):
        for item in data:
            yield from _json_ld_nodes(item)


def _is_recipe(node):
    node_type = node.get("@type")
    if isinstance(node_type, str):
        return node_type.lower() == "recipe"
    if isinstance(node_type, (list, tuple)):
        return any(str(item).lower() == "recipe" for item in node_type)
    return False


def _json_ld_steps(value, depth=0):
    """schema.org recipeInstructions, which is four different shapes in the wild."""
    if depth > 3:
        return []
    if isinstance(value, str):
        return _STEP_SPLIT.split(value)
    if isinstance(value, dict):
        # HowToSection groups steps under itemListElement; HowToStep is a leaf.
        if "itemListElement" in value:
            return _json_ld_steps(value["itemListElement"], depth + 1)
        return [value.get("text") or value.get("name") or ""]

    steps = []
    if isinstance(value, list):
        for item in value:
            steps.extend(_json_ld_steps(item, depth + 1))
    return steps


def _json_ld_image(value, depth=0):
    if depth > 3:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return _json_ld_image(value.get("url") or value.get("contentUrl"), depth + 1)
    if isinstance(value, list):
        for item in value:
            found = _json_ld_image(item, depth + 1)
            if found:
                return found
    return ""


def _from_json_ld(page_html, url):
    soup = BeautifulSoup(page_html, "html.parser")

    for tag in soup.find_all("script", attrs={"type": re.compile("ld\\+json", re.I)}):
        raw = tag.string or tag.get_text()
        if not raw:
            continue
        try:
            # strict=False tolerates the raw newlines inside strings that a few
            # CMSes emit, which json.loads otherwise rejects outright.
            data = json.loads(raw, strict=False)
        except ValueError:
            continue

        for node in _json_ld_nodes(data):
            if not _is_recipe(node):
                continue

            return {
                "recipe_name": clean_text(node.get("name"), MAX_NAME_CHARS),
                "style": _pick_style(
                    node.get("recipeCategory"), node.get("recipeCuisine")
                ),
                "ingredients": _clean_list(
                    node.get("recipeIngredient") or node.get("ingredients"),
                    MAX_INGREDIENT_CHARS,
                ),
                "instructions": _clean_list(
                    _json_ld_steps(node.get("recipeInstructions")), MAX_STEP_CHARS
                ),
                "image_url": _absolute(_json_ld_image(node.get("image")), url),
            }

    return None


def _usable(recipe):
    """A name plus something to cook with — anything less isn't worth prefilling."""
    return bool(
        recipe
        and recipe["recipe_name"]
        and (recipe["ingredients"] or recipe["instructions"])
    )


def extract_recipe(page_html, url):
    """Return form-shaped fields for `page_html`, or raise NoRecipeFound."""
    attempts = [("recipe-scrapers", _from_recipe_scrapers), ("json-ld", _from_json_ld)]

    for parser, extractor in attempts:
        try:
            recipe = extractor(page_html, url)
        except Exception:
            recipe = None

        if _usable(recipe):
            return {**recipe, "source_url": url, "parser": parser}

    raise NoRecipeFound(
        "No recipe could be read from that page. Some sites publish recipes as "
        "images or load them with JavaScript — those have to be typed in by hand."
    )
