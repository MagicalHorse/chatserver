#!/bin/bash
cd /var/www/server_node/release
RELEASE_NAME=$(date +%Y%m%d%H%M%S)
BRANCH="develop"
mkdir $RELEASE_NAME
cd $RELEASE_NAME
GIT_HOST="git@github.com:MagicalHorse/chatserver.git"
git clone $GIT_HOST
cd chatserver
git checkout $BRANCH
npm install
pm2 delete all
ENV=demo pm2 start chat.js --name chat1
ENV=production pm2 start chat.js --name chat2