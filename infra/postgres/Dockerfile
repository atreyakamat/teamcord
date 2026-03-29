FROM timescale/timescaledb:latest-pg16

# Install pgvector
RUN apk add --no-cache --virtual .build-deps \
    build-base \
    git \
    clang15 \
    llvm15-dev \
    postgresql16-dev \
    && git clone --branch v0.7.0 https://github.com/pgvector/pgvector.git \
    && cd pgvector \
    && make LLVM=0 \
    && make install LLVM=0 \
    && cd .. \
    && rm -rf pgvector \
    && apk del .build-deps
