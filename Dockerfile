FROM denoland/deno:latest AS builder

WORKDIR /app
COPY . .

RUN deno install
RUN deno task build

FROM debian:bookworm-slim

WORKDIR /

RUN apt-get update && apt-get install -y curl wget gnupg \
&& wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
&& sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
&& apt-get update && apt-get install -y google-chrome-stable fonts-noto-core fonts-noto-extra fonts-noto-ui-core fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 --no-install-recommends \
&& rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/output/HTML2WebP /usr/local/bin/HTML2WebP
COPY ./LICENSE /usr/local/bin/HTML2WebP_LICENSE
COPY ./runtime_health.html /runtime_health.html

RUN HTML2WebP --setup

EXPOSE 8080
CMD ["HTML2WebP"]
