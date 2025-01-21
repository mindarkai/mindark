#!/usr/bin/env bash
set -e

set +e
which docker-compose
has_compose=$?
set -e

if [ "$has_compose" == "0" ]; then
    docker-compose $@
else
    docker compose $@
fi
