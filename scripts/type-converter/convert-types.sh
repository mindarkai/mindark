#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
mkdir -p src

export TS_INPUT=src/mindark-types.ts
export TS_OUTPUT=src/mindark-schemes.ts

cp ../../packages/mindark/src/lib/mindark-types.ts src
npx ts-to-zod
cp $TS_OUTPUT ../../packages/mindark/src/lib/mindark-schemes.ts
echo "Type schemes written to packages/mindark/src/lib/mindark-schemes.ts"
