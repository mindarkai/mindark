#!/bin/bash
set -e

tag=$1

if [ "$tag" == "" ]; then
    echo 'First arg must be a build tag such as "latest" or "prd"'
    exit 1
fi

dir="examples/$tag"

npx esbuild \
    --loader:.node=file \
    --target=node18 \
    --platform=node \
    --bundle packages/mindark-host/src/bin/mindark-host.ts \
    --tsconfig=packages/mindark-host/tsconfig.lib.json \
    --outdir=dist/packages/mindark-host/bin



mkdir -p $dir

cp dist/packages/mindark-host/bin/*.node $dir/

echo '#!/usr/bin/env node' > $dir/mindark-host
cat dist/packages/mindark-host/bin/mindark-host.js >> $dir/mindark-host
chmod +x $dir/mindark-host


echo "Host executable - $dir/mindark-host"
