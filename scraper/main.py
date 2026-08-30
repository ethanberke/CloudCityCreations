"""FastAPI wrapper around the recipe importer.

Deliberately not reachable from the browser: Express owns `/api/scrape` and
calls this service server-to-server, so the client keeps one origin, one CORS
config and one port to put behind the reverse proxy when auth lands (#5). There
is no CORS middleware here for the same reason — if a page can call this
directly, something is misconfigured.
"""

import logging
import os

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from extract import NoRecipeFound, extract_recipe
from fetching import DEFAULT_TIMEOUT, FetchError, fetch_page

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
log = logging.getLogger("importer")

FETCH_TIMEOUT = float(os.environ.get("SCRAPE_TIMEOUT", DEFAULT_TIMEOUT))

app = FastAPI(
    title="C3 Creations recipe importer",
    description="Reads a public recipe URL and returns Contribute-form fields.",
    version="1.0.0",
)


class ScrapeRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2000)


class ScrapeResponse(BaseModel):
    recipe_name: str
    style: str
    ingredients: list[str]
    instructions: list[str]
    # Left as the source site's URL. Mirroring it onto local disk is the
    # server's job, and only once the contributor confirms the submission.
    image_url: str
    source_url: str
    parser: str


@app.get("/health")
def health():
    return {"status": "ok"}


# Sync on purpose: httpx here is blocking, and FastAPI runs a `def` endpoint in
# its threadpool. Declaring it `async` would block the event loop for the whole
# fetch instead.
@app.post("/scrape", response_model=ScrapeResponse)
def scrape(request: ScrapeRequest):
    url = request.url.strip()

    try:
        final_url, page_html = fetch_page(url, timeout=FETCH_TIMEOUT)
    except FetchError as error:
        # Expected outcomes of pointing at the open internet — a dead link, a
        # site that blocks readers, a private address — not server faults.
        log.info("fetch failed for %s: %s", url, error.message)
        raise HTTPException(status_code=error.status, detail=error.message) from None

    try:
        # The post-redirect URL is what relative image paths resolve against.
        recipe = extract_recipe(page_html, final_url)
    except NoRecipeFound as error:
        log.info("no recipe found at %s", final_url)
        raise HTTPException(status_code=422, detail=str(error)) from None

    log.info(
        "imported %r from %s via %s (%d ingredients, %d steps)",
        recipe["recipe_name"],
        final_url,
        recipe["parser"],
        len(recipe["ingredients"]),
        len(recipe["instructions"]),
    )
    return recipe
