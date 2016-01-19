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

pm2 delete development
pm2 delete demo
# pm2 delete production
ENV=demo pm2 start chat.js --name demo -f
ENV=development pm2 start chat.js --name development -f
# ENV=production pm2 start chat.js --name production -f