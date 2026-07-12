# ─────────────────────────────────────────────────────────────────────────────
# MindSpot — Multi-stage Dockerfile
# Produces a single image that serves both the React UI and the .NET 8 API.
# RavenDB runs as a separate service (see docker-compose.yml).
#
# Build locally:
#   docker build -t mindspot .
#
# Build for a specific public URL (replaces the hardcoded dev URL in the bundle):
#   docker build --build-arg API_URL=https://mindspot.yourdomain.com -t mindspot .
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build React / Vite frontend ─────────────────────────────────────
FROM node:20-alpine AS frontend

WORKDIR /client

# Copy manifests first so Docker layer-caches the npm install step.
COPY MindSpot-client/package*.json ./
RUN npm ci --silent

COPY MindSpot-client/ .

# API_URL is the public URL users will open in their browser.
# Leave blank (default) for same-origin serving — the exe serves both the
# frontend and the API on the same port, so relative paths work automatically.
ARG API_URL=

RUN npm run build

# Post-build URL patch: replace the hardcoded dev URL in every compiled JS
# chunk with whatever API_URL was provided at build time.
# This touches only the compiled output — source files are never changed.
RUN if [ -n "$API_URL" ]; then \
        find dist/assets -name "*.js" \
          -exec sed -i "s|https://localhost:7160|${API_URL}|g" {} + ; \
        echo "Patched API URL → ${API_URL}"; \
    else \
        echo "API_URL not set — keeping relative URLs (same-origin serving)."; \
    fi

# ── Stage 2: Build .NET 8 server ─────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS dotnet-build

WORKDIR /server
COPY MindSpot-server/ .

# Embed the React build into wwwroot so ASP.NET Core's UseStaticFiles()
# middleware can serve it — no separate web server needed.
COPY --from=frontend /client/dist ./wwwroot

RUN dotnet publish -c Release -o /publish

# ── Stage 3: Production runtime image ────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0

# ── System dependencies ───────────────────────────────────────────────────────
# chromium + chromium-driver: headless browser for the license-verification
#   Selenium scraper (Scripts/verify_license.py).
# python3 + venv: runs the scraper; isolated from system Python.
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip python3-venv \
        chromium chromium-driver \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── .NET application ──────────────────────────────────────────────────────────
COPY --from=dotnet-build /publish .

# ── Python scraper ────────────────────────────────────────────────────────────
COPY MindSpot-server/Scripts ./Scripts
RUN python3 -m venv /app/venv \
    && /app/venv/bin/pip install --no-cache-dir \
        selenium \
        webdriver-manager \
        deep-translator

# ── Runtime environment variables ─────────────────────────────────────────────
# Force production mode (disables Swagger UI, enables HTTP-only Kestrel config).
ENV ASPNETCORE_ENVIRONMENT=Production

# Listen on HTTP port 7160 — TLS termination is handled by the reverse proxy
# (Railway / nginx / Caddy) in front of this container.
ENV ASPNETCORE_URLS=http://+:7160

# Tell verify_license.py to run Chrome in headless mode (no display in Docker).
ENV CHROME_HEADLESS=1

# Point the scraper at the system-installed chromedriver so it doesn't try to
# download one at runtime via webdriver-manager (slow and network-dependent).
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver

# Tell LicenseVerificationService (C#) where to find the Python interpreter.
# appsettings.json default is "py" (Windows); override it for Linux here.
ENV Verification__PythonExecutable=/app/venv/bin/python

EXPOSE 7160

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -sf http://localhost:7160/ || exit 1

ENTRYPOINT ["./MindSpot-server"]
