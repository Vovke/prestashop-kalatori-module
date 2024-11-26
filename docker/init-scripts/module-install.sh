#!/bin/sh

set -eu

cd "$PS_FOLDER"
echo "* [kalatori] installing the module..."
php -d memory_limit=-1 bin/console prestashop:module --no-interaction install "kalatori"
