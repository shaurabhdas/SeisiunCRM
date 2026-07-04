FROM node:20-alpine

# Install dependencies required by Prisma engine on Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for ts-node-dev)
RUN npm install

# Copy schema and generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy application source code
COPY . .

EXPOSE 5000

# Run local development server
CMD ["npm", "run", "dev"]
