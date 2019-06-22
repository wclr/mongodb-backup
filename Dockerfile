FROM node:12.4.0-slim

RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv 9DA31620334BD75D9DCB49F368818C72E52529D4 \
  && echo "deb http://repo.mongodb.org/apt/debian stretch/mongodb-org/4.0 main" | tee /etc/apt/sources.list.d/mongodb-org-4.0.list \
  && apt-get update \
  && apt-get install -y mongodb-org-tools

WORKDIR /app

ADD ./package.json /app/package.json
RUN yarn --production

ADD ./build /app
RUN mkdir .tmp

CMD ["node", "run"]
