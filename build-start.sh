#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

packages/mindark-host/build-host.sh latest

cd examples

latest/mindark-host --name main $@
