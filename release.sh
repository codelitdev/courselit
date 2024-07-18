#!/bin/bash

# Check if an argument is provided
if [ $# -eq 0 ]; then
    echo "Error: Please provide 'patch' or 'minor' as an argument."
    exit 1
fi

# Check if the argument is valid
if [ "$1" != "patch" ] && [ "$1" != "minor" ]; then
    echo "Error: Invalid argument. Please use 'patch' or 'minor'."
    exit 1
fi

git checkout main

# update the version
yarn workspaces foreach version "$1"

# get the new version
VERSION=$(grep -m1 '"version":' apps/web/package.json | cut -d'"' -f4)

# commit, tag and push
git add . 
git commit -m v$VERSION
git push
git tag -a "v${VERSION}" -m "v${VERSION}"
git push origin --tags 