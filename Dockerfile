FROM node:20

WORKDIR /app

COPY . .

COPY package*.json ./

EXPOSE 5000

RUN npm install


CMD ["node","app.js"]

