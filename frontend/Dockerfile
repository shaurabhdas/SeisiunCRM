FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

EXPOSE 3000

# Run Next.js local development server
CMD ["npm", "run", "dev"]
