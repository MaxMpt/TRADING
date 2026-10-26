#!/bin/sh
set -eu
cd /opt/ordo
git pull --ff-only
npm install
systemctl restart ordo
echo "обновлено"
