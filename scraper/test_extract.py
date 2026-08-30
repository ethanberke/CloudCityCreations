"""Tests for the parsing layer — the part of this service that guesses.

Fetching isn't covered here: it needs the network, and its interesting cases
(redirect to a private address, oversized body) are guard rails rather than
parsing. What follows are the page shapes that actually broke recipe imports:
steps split into HowToStep objects, steps grouped into HowToSections, steps as
one newline-joined string, and a recipe buried in an @graph.

Run: python -m pytest  (from the scraper directory, with requirements-dev.txt)
"""

import json

import pytest

from extract import (
    NoRecipeFound,
    _from_json_ld,
    _pick_style,
    clean_text,
    extract_recipe,
)

BASE_URL = "https://example.com/recipes/bantha-stew"


def page(recipe_json):
    return f"""
    <html><head><title>Bantha Stew</title>
    <script type="application/ld+json">{json.dumps(recipe_json)}</script>
    </head><body><p>A recipe.</p></body></html>
    """


def test_how_to_step_objects():
    recipe = _from_json_ld(
        page(
            {
                "@context": "https://schema.org",
                "@type": "Recipe",
                "name": "Bantha Stew",
                "recipeCategory": "Main Dish",
                "recipeIngredient": ["2 lb bantha shoulder", "1 onion, diced"],
                "recipeInstructions": [
                    {"@type": "HowToStep", "text": "Brown the meat."},
                    {"@type": "HowToStep", "text": "Simmer for two hours."},
                ],
                "image": "/photos/stew.jpg",
            }
        ),
        BASE_URL,
    )

    assert recipe["recipe_name"] == "Bantha Stew"
    assert recipe["style"] == "Main Dish"
    assert recipe["ingredients"] == ["2 lb bantha shoulder", "1 onion, diced"]
    assert recipe["instructions"] == ["Brown the meat.", "Simmer for two hours."]
    # Relative image paths resolve against the page they came from.
    assert recipe["image_url"] == "https://example.com/photos/stew.jpg"


def test_how_to_sections_are_flattened():
    recipe = _from_json_ld(
        page(
            {
                "@type": "Recipe",
                "name": "Nerf Roast",
                "recipeIngredient": ["1 nerf"],
                "recipeInstructions": [
                    {
                        "@type": "HowToSection",
                        "name": "Marinade",
                        "itemListElement": [
                            {"@type": "HowToStep", "text": "Mix the spices."},
                            {"@type": "HowToStep", "text": "Rest overnight."},
                        ],
                    },
                    {"@type": "HowToStep", "text": "Roast until done."},
                ],
            }
        ),
        BASE_URL,
    )

    assert recipe["instructions"] == [
        "Mix the spices.",
        "Rest overnight.",
        "Roast until done.",
    ]


def test_instructions_as_one_string_split_on_newlines():
    recipe = _from_json_ld(
        page(
            {
                "@type": "Recipe",
                "name": "Blue Milk",
                "recipeIngredient": ["1 qt blue milk"],
                "recipeInstructions": "Chill the milk.\nPour.\n\nServe cold.",
            }
        ),
        BASE_URL,
    )

    assert recipe["instructions"] == ["Chill the milk.", "Pour.", "Serve cold."]


def test_recipe_inside_a_graph_with_list_type():
    recipe = _from_json_ld(
        page(
            {
                "@context": "https://schema.org",
                "@graph": [
                    {"@type": "WebSite", "name": "Some Food Blog"},
                    {
                        "@type": ["Recipe", "NewsArticle"],
                        "name": "Endorian Tip-Yip",
                        "recipeCuisine": "endorian",
                        "recipeIngredient": ["1 tip-yip"],
                        "recipeInstructions": [{"text": "Fry it."}],
                        "image": {
                            "@type": "ImageObject",
                            "url": "https://cdn.example/1.jpg",
                        },
                    },
                ],
            }
        ),
        BASE_URL,
    )

    assert recipe["recipe_name"] == "Endorian Tip-Yip"
    # No category on this one, so cuisine fills style in — title-cased because
    # the site wrote it lowercase.
    assert recipe["style"] == "Endorian"
    assert recipe["image_url"] == "https://cdn.example/1.jpg"


def test_markup_and_entities_are_stripped_from_fields():
    recipe = _from_json_ld(
        page(
            {
                "@type": "Recipe",
                "name": "Spiced &amp; Salted Nuna",
                "recipeIngredient": ["<span>1 nuna</span>", "  ", "&frac12; cup oil"],
                "recipeInstructions": [{"text": "Season the   nuna."}],
            }
        ),
        BASE_URL,
    )

    assert recipe["recipe_name"] == "Spiced & Salted Nuna"
    # Blank rows are dropped rather than becoming empty form fields.
    assert recipe["ingredients"] == ["1 nuna", "½ cup oil"]
    assert recipe["instructions"] == ["Season the nuna."]


def test_page_without_a_recipe_raises():
    html = "<html><body><h1>About us</h1><p>We like food.</p></body></html>"

    with pytest.raises(NoRecipeFound):
        extract_recipe(html, BASE_URL)


def test_json_ld_is_used_when_a_page_has_only_that():
    recipe = extract_recipe(
        page(
            {
                "@type": "Recipe",
                "name": "Ronto Wrap",
                "recipeCategory": "sandwich",
                "recipeIngredient": ["1 ronto"],
                "recipeInstructions": [{"text": "Wrap it."}],
            }
        ),
        BASE_URL,
    )

    assert recipe["recipe_name"] == "Ronto Wrap"
    assert recipe["source_url"] == BASE_URL
    assert recipe["parser"] in ("recipe-scrapers", "json-ld")


def test_style_prefers_category_and_keeps_one_value():
    assert _pick_style(["Dessert", "Cookies"], "American") == "Dessert"
    assert _pick_style("Dessert, Cookies", None) == "Dessert"
    assert _pick_style(None, "Thai") == "Thai"
    assert _pick_style(None, None) == ""
    # Acronyms survive: only all-lowercase values get title-cased.
    assert _pick_style("BBQ", None) == "BBQ"
    assert _pick_style("main dish", None) == "Main Dish"


def test_clean_text_truncates_to_the_limit():
    assert clean_text("x" * 500, 10) == "x" * 10
