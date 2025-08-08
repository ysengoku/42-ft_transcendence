FROM node:22-alpine

WORKDIR /app
COPY ./app /app

RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
