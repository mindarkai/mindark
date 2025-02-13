#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

cd examples

stable/mindark-host --name main $@
