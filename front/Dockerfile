FROM node:22-alpine AS production

WORKDIR /app

COPY ./app/package*.json ./
RUN npm install

# Copy only necessary files
COPY ./app/src ./src
COPY ./app/public ./public
COPY ./app/index.html ./
COPY ./app/babel.config.cjs ./
COPY ./app/vite.config.js ./

# Build static files
RUN npm run build

FROM node:22-alpine AS development

WORKDIR /app
COPY ./app /app

RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
