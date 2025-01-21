#!/bin/bash
set -e
cd "$(dirname "$0")"

ENV=$1
if [ "$ENV" = "" ]; then
    ENV='production'
fi
echo "creating client env vars. env: $ENV"

source config.sh

cd ..


OUT_PATH='packages/frontend/src/lib/_dynamic-client-env-vars.ts'

node --harmony << EOF > $OUT_PATH
const envs={NODE_ENV:'$ENV'||'production'}
if(envs.NODE_ENV!=='production'){
    const prefixList=['NX_PUBLIC_','NX_','NEXT_PUBLIC_']
    for(const e in process.env){
        for(const prefix of prefixList){
            if(!e.startsWith(prefix)){
                continue;
            }
            envs[e.substring(prefix.length)]=process.env[e];
            for(const p of prefixList){
                envs[p+e.substring(prefix.length)]=process.env[e];
            }
        }
    }
}
console.log('export const _dynamicClientEnvVars:Record<string,string>='+JSON.stringify(envs,null,4));

EOF

echo "client env vars written to $OUT_PATH"
