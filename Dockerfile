FROM ollama/ollama:0.7.0

# Qwen2.5:1.5b - Docker
ENV API_BASE_URL=http://127.0.0.1:11434/api
ENV MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b

# Install system dependencies and Node.js
RUN apt-get update && apt-get install -y \
  curl \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm

# Create app directory
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
# Copy the .env file and rename it to .env inside the container




# Install dependencies
RUN pnpm install

# Copy the rest of the application
COPY . .

# Override the default entrypoint
ENTRYPOINT ["/bin/sh", "-c"]


# Start Ollama service and pull the model, then run the app in dev mode for Playground
CMD ["ollama serve & sleep 5 && ollama pull ${MODEL_NAME_AT_ENDPOINT} && pnpm dev"]