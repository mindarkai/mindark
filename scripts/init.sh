#!/usr/bin/env bash
set -e
pushd "$(dirname "$0")/.."
pushd '..'

if [ -d './iyio-common' ]; then
    echo 'iyio-common directory already exists'
else
    echo 'Cloning iyio-common'
    git clone https://github.com/iyioio/common.git iyio-common
fi

if [ -d './convo-lang' ]; then
    echo 'convo-lang directory already exists'
else
    echo 'Cloning convo-lang'
    git clone https://github.com/convo-lang/convo-lang.git
fi


popd

echo "Injecting packages"

npx pkij --inject
