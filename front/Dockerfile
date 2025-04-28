FROM node:22-alpine AS production

WORKDIR /app

COPY ./app/package*.json ./
RUN npm install
COPY ./app ./app

# Build static files
RUN npm run build

FROM node:22-alpine AS development

COPY ./app /app
WORKDIR /app

COPY ./app/package*.json .
RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]