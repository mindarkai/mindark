#!/bin/bash
set -e
cd "$(dirname "$0")/.."

#if [ "$1" == "--injected" ]; then
    npx ts-node -r tsconfig-paths/register \
        --project packages/any-comp-cli/tsconfig.lib.json \
        packages/any-comp-cli/src/bin/watch-comp-dirs \
        --dir packages/components/src/lib \
        --dir packages/react-common/src/lib \
        --dir packages/convo-lang-react/src/lib \
        --dir packages/pdf-viewer/src/lib \
        --dir packages/syn-taxi/src/lib \
        --outDir packages/cs-any-comp/src/lib \
        --infoOutPath packages/mindarkai-common/src/lib/component-reg.ts \
        --infoExportName componentRegistry \
        $@
# else
#     npx watch-any-comp \
#         --dir packages/components/src/lib \
#         --outDir packages/web-app/any \
#         --infoOutPath packages/mindarkai-common/src/lib/component-reg.ts \
#         --infoExportName componentRegistry \
#         $@
# fi
