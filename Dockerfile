FROM denoland/deno:latest AS builder

WORKDIR /app
COPY . .

RUN deno install --allow-import
RUN deno task build

FROM debian:bookworm-slim

WORKDIR /

RUN apt-get update && apt-get install -y fonts-noto-core fonts-roboto chromium && rm -rf /var/lib/apt/lists/*
COPY --chown=root:root local.conf /etc/fonts/local.conf
RUN chmod 444 /etc/fonts/local.conf

COPY --chown=root:root --from=builder /app/output/HTML2WebP /usr/local/bin/HTML2WebP
COPY --chown=root:root ./LICENSE /HTML2WebP_LICENSE
COPY --chown=root:root ./runtime_health.html /runtime_health.html

RUN chmod 555 /usr/local/bin/HTML2WebP
RUN chmod 444 /HTML2WebP_LICENSE
RUN chmod 444 /runtime_health.html

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

WORKDIR /home/appuser

EXPOSE 8080
CMD ["HTML2WebP"]
