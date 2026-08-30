"""Outbound HTTP for the importer, with the guard rails a LAN box needs.

Every URL handled here was pasted by a person, and this service can route to the
homelab's own subnet. Fetching one is therefore a request we make on someone
else's behalf to anywhere we can reach (SSRF), so each hop is resolved and
checked against the non-public address ranges before a socket opens, and the
body is read against a byte cap so a hostile or broken host can't stream until
the container runs out of memory.
"""

import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import httpx

# Recipe sites block obviously headless clients, and an honest name is easier to
# allowlist than a browser string that lies about what this is.
USER_AGENT = (
    "C3CreationsRecipeImporter/1.0 (self-hosted recipe importer; "
    "+https://github.com/ethanberke/CloudCityCreations)"
)

MAX_REDIRECTS = 4
DEFAULT_TIMEOUT = 15.0
MAX_PAGE_BYTES = 4 * 1024 * 1024


class FetchError(Exception):
    """A fetch failure worth showing the person who pasted the URL."""

    def __init__(self, message, status=502):
        super().__init__(message)
        self.message = message
        self.status = status


class BlockedURL(FetchError):
    def __init__(self, message):
        super().__init__(message, status=400)


def _check_public(host, port):
    """Resolve `host` and refuse anything that isn't a public address.

    `is_global` is the whole check on purpose: it already excludes loopback,
    private ranges, link-local (including cloud metadata at 169.254.169.254),
    CGNAT and the reserved blocks, for both IPv4 and IPv6, so there is no
    hand-maintained list here to fall behind.
    """
    try:
        infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        raise BlockedURL(f"Could not resolve {host}.") from None

    for info in infos:
        address = ipaddress.ip_address(info[4][0])
        if not address.is_global:
            raise BlockedURL(
                f"{host} resolves to a private address ({address}). "
                "Only public recipe sites can be imported."
            )


def validate_url(url):
    """Return `url` if it is a public http(s) URL, else raise BlockedURL."""
    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise BlockedURL("Only http:// and https:// links can be imported.")
    if not parsed.hostname:
        raise BlockedURL("That doesn't look like a link to a web page.")

    _check_public(
        parsed.hostname, parsed.port or (443 if parsed.scheme == "https" else 80)
    )
    return url


def _check_response(response):
    """Reject responses that aren't an HTML page we can parse."""
    if response.status_code in (403, 429):
        raise FetchError(
            "That site refused the request — it likely blocks automated "
            "readers. Copy the recipe in by hand instead.",
            status=502,
        )
    if response.status_code >= 400:
        raise FetchError(f"That page returned {response.status_code}.", status=502)

    content_type = response.headers.get("content-type", "").split(";")[0].strip()
    if content_type and "html" not in content_type.lower():
        raise FetchError(f"That link is {content_type}, not a web page.", status=415)


def _next_hop(response, current):
    location = response.headers.get("location")
    if not location:
        raise FetchError("The site sent a redirect with nowhere to go.")
    return validate_url(urljoin(current, location))


def fetch_page(url, timeout=DEFAULT_TIMEOUT):
    """Fetch an HTML page, following redirects by hand.

    httpx's own redirect handling would follow a hop straight to a private
    address, since only the first URL passed through validate_url. Doing it a
    hop at a time is what keeps the check on every one of them.

    Returns `(final_url, html)`.
    """
    current = validate_url(url)

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    with httpx.Client(
        follow_redirects=False, timeout=timeout, headers=headers
    ) as client:
        for _ in range(MAX_REDIRECTS + 1):
            try:
                with client.stream("GET", current) as response:
                    if response.is_redirect:
                        current = _next_hop(response, current)
                        continue

                    _check_response(response)
                    return current, _read_capped(response)
            except httpx.TimeoutException:
                raise FetchError(
                    "That site took too long to respond.", status=504
                ) from None
            except httpx.HTTPError as error:
                raise FetchError(f"Could not reach that site: {error}") from None

    raise FetchError("That link redirected too many times.")


def _read_capped(response):
    chunks = []
    total = 0

    for chunk in response.iter_bytes():
        total += len(chunk)
        if total > MAX_PAGE_BYTES:
            raise FetchError("That page is too large to read.", status=413)
        chunks.append(chunk)

    # Decoded here rather than via response.text: that property wants the whole
    # body buffered by httpx itself, which is exactly what the cap above avoids.
    # `errors="replace"` because a mis-declared charset should cost a few
    # mangled characters in one ingredient, not the whole import.
    return b"".join(chunks).decode(response.encoding or "utf-8", errors="replace")
