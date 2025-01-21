#!/bin/bash
set -e
cd "$(dirname "$0")/.."

NAME=$1

if [ "$NAME" == "" ]; then
    echo 'First arg should be name app to open code of'
    exit 1
fi

code "./data/files/apps/$NAME"
