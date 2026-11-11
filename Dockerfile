FROM node:20-alpine

WORKDIR /app

# Cache dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Receive build-time environment variables from .env via docker-compose
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Copy application source code and compile
COPY . .
RUN npm run build

EXPOSE 3000

# Serve compiled production bundle via Vite preview on port 3000
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
