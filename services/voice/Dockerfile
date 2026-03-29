FROM node:20-slim

# Install dependencies for building mediasoup
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    git \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# RTC ports
EXPOSE 3004
EXPOSE 10000-10100/udp

CMD ["npm", "run", "start"]
