# Saihex Studios' HTML2WebP V1.2

---

<div align="center">
  <img width="512" alt="SaihexWare Collection Logo" src="https://s3.saihex.com/public/logos/saihexware.svg"/>
</div>

---

**HTML2WebP** is a **lightweight\* Deno server** that converts HTML into **WebP
images**, supporting **dynamic placeholders** for template values.

It’s designed for stability and automation: the server automatically exits every
**48 hours**, relying on Docker’s restart policy (`on-failure`) to keep
instances fresh.

Disclaimer*: The app itself might be light. But, Chromium, one of its
dependencies is not.

## ⚠️ **SECURITY WARNING**

Astral is configured to run **Chromium without its internal sandbox** inside the
Docker container.\
This is safe as long as the container itself is properly isolated.

- Do **NOT** run the container with `--network=host`.
- Do **NOT** expose your API port to the host machine during local testing.
- In production, always run behind a reverse proxy (e.g., Nginx, Caddy) and
  expose **only** the necessary ports.

---

## Features

- **Dynamic HTML > WebP** rendering
- **Template placeholders** using `{{key}}` syntax
- **Fresh page per request** to avoid contamination
- **Page pooling** with up to **5 concurrent requests** to prevent server
  overload
- **Default resolution:** `1700x893` (used if unspecified or invalid)
- **Health check endpoint:** `/health`
- **Port:** `8080`
- **Internal in-memory result caching with custom identifier**

---

## Request Structure

Send JSON to the server:

```json
{
  "html": "string",
  "cache_id": "saihex_public_blog_post_12345",
  "width": 1700,
  "height": 780,
  "values": {
    "title": "My Blog Post",
    "uploader_username": "Isky",
    "status": "Edited",
    "date": "2025-08-19",
    "id": "12345",
    "uploader_pfp": "https://example.com/avatar.png"
  },
  "image_values": [
    "uploader_pfp"
  ]
}
```

- **html**\
  The raw HTML template that will be rendered. Placeholders inside this template
  are substituted using values from `values`.

- **width / height**\
  Dimensions of the rendered output. Optional; defaults to **1700 × 780** if not
  provided.

- **values**\
  A map of **placeholder keys → string values**. These are substituted into the
  HTML during rendering.
  - Some values may be plain text (like `title`, `date`).
  - Others may be image URLs (like `uploader_pfp`).

- **cache_id**\
  Identifier used for caching (Optional).
  - If the string is **empty or invalid**, no cache entry will be created.
  - If valid, the rendered result is cached for **1200 seconds (20 minutes)**.
  - The cache duration is fixed and cannot be changed at runtime.

- **image_values**\
  An array of keys from `values` that represent **image URLs** which should be
  **fetched and embedded as base64 blobs before rendering**.
  - Ensures rendering doesn’t depend on external services.
  - Particularly important for services like **Gravatar**, which may cause
    incomplete image otherwise.

---

## Example Use Case

- OG Image Generator for blog posts, websites, or social media
- Can dynamically render different posts using the same template
