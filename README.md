# Saihex Studios' HTML2WebP

---

<div align="center">
  <img width="512" alt="SaihexWare Collection Logo" src="https://s3.saihex.com/public/logos/saihexware.svg"/>
</div>

---

**HTML2WebP** is a **lightweight\* Deno server** that converts HTML into **WebP images**, supporting **dynamic placeholders** for template values.

It’s designed for stability and automation: the server automatically exits every **48 hours**, relying on Docker’s restart policy (`on-failure`) to keep instances fresh.

Disclaimer*: The app itself might be light. But, Chrome, one of its dependencies is not.

---

## Features

- **Dynamic HTML > WebP** rendering
- **Template placeholders** using `{{key}}` syntax
- **Fresh page per request** to avoid contamination
- **Page pooling** with up to **5 concurrent requests** to prevent server overload
- **Default resolution:** `1700x893` (used if unspecified or invalid)
- **Health check endpoint:** `/health`
- **Port:** `8080`

---

## Request Structure

Send JSON to the server:

```json
{
  "html": "string",
  "width": 1700,
  "height": 780,
  "values": {
    "title": "My Blog Post",
    "uploader_username": "Isky",
    "status": "Edited",
    "date": "2025-08-19",
    "id": "12345",
    "uploader_pfp": "https://example.com/avatar.png"
  }
}
```

- html – The template HTML to render
- width / height – Optional, defaults to 1700x780
- values – Key-value pairs for placeholders

---

## Example Use Case

- OG Image Generator for blog posts, websites, or social media
- Can dynamically render different posts using the same template
