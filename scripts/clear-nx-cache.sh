#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

rm -rf .nx
rm -rf node_modules/.cache
rm -rf cdk.out
rm -rf packages/cdk/cdk.out
rm -rf dist
rm -rf packages/web-app/.next
rm -rf packages/web-app/exported

rm -rf node_modules/.cache
npx nx reset
