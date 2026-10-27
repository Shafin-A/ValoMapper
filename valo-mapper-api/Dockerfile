# ---- VRFKit (Rust, pinned) ----
# VRFKit is a glibc binary, so it cannot run on the old Alpine runtime. Keep it
# in its own stage: this is the slow layer, and Docker caches it while the Go
# code changes. Build just this stage with:
#   docker build --target vrfkit -t vrfkit-pinned .
FROM rust:1.86-bookworm AS vrfkit

ARG VRFKIT_VERSION=v0.3.0
ARG VRFKIT_SHA256=9b9fababaefc1094f6fbed1b9632b19c91d596d7bbea6b4e641ba4b0d9b61378

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git patch \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# Pin both the tag and the tarball hash. The hash check fails the build if the
# upstream tag is moved or the download is corrupted.
RUN curl -fsSL \
      "https://github.com/yakisoba0728/vrfkit/archive/refs/tags/${VRFKIT_VERSION}.tar.gz" \
      -o vrfkit.tar.gz \
 && echo "${VRFKIT_SHA256}  vrfkit.tar.gz" | sha256sum -c - \
 && tar -xzf vrfkit.tar.gz --strip-components=1 \
 && rm vrfkit.tar.gz

# FxHash is deliberately not HashDoS-resistant; this parser sits behind a
# network boundary. `git apply` fails the build if upstream changes the file.
COPY patches/vrfkit-std-hasher.patch /tmp/
RUN git apply /tmp/vrfkit-std-hasher.patch

RUN cargo build --release -p vrfkit --features export --locked

ENTRYPOINT ["/src/target/release/vrfkit"]

# ---- Go ----
FROM golang:1.26-bookworm AS gobuild

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o main .

# ---- runtime ----
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates libgcc-s1 \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 10001 --create-home valomapper

WORKDIR /app

COPY --from=gobuild /app/main .
COPY --from=gobuild /app/db/migrations ./db/migrations
COPY --from=vrfkit /src/target/release/vrfkit /usr/local/bin/vrfkit

ENV VRFKIT_BIN=/usr/local/bin/vrfkit

# Only /tmp is writable; replay uploads and exports never touch the image.
USER valomapper

EXPOSE 8080

CMD ["./main"]
