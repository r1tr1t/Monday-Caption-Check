FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV MONDAY_SIGNING_SECRET=f5ea3dc77e9d4dc9fd637a36caebf4dc \
    TUNNEL_SUBDOMAIN=integration-10113907 \ 
    PORT=8302

EXPOSE 8302

CMD ["npm", "run", "server"]



