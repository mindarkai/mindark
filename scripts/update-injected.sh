#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
startDir="$(pwd)"

printf "\n\n"

echo "  ###################################"
echo " ##### Convo Studio Git Status #####"
echo "###################################"
printf "\n"
git status
printf "\n\n"


echo "  #################################"
echo " ##### Convo Lang Git Status #####"
echo "#################################"
printf "\n"
cd ../convo-lang
git status
printf "\n\n"

echo "  ##################################"
echo " ##### IYIO Common Git Status #####"
echo "##################################"
printf "\n"
cd ../iyio-common
git status
printf "\n\n"

cd "$startDir"

if [ "$1" != "--yes" ]; then
    echo "GitPull pulls will be executed in multiple directories"
    echo "Do you want to continue with the update? [y/N]"
    read continueWithUpdate
    if [ "$continueWithUpdate" != "y" ]; then
        echo "Update canceled"
        exit 0
    fi
fi

echo "Updating"

git pull

cd ../convo-lang
git pull

cd ../iyio-common
git pull

cd "$startDir"
npx pkij --inject --delete-unlinked
