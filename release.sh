#!/bin/bash

# Check if an argument is provided
if [ $# -eq 0 ]; then
    echo "USAGE: ./release.sh <version_number>"
    exit 1
fi

# # Check if the argument is valid
# if [ "$1" != "patch" ] && [ "$1" != "minor" ]; then
#     echo "Error: Invalid argument. Please use 'patch' or 'minor'."
#     exit 1
# fi

# git checkout main

# # Update versions in apps
# for dir in apps/*/; do
#     cd "$dir" || exit
#     pnpm version "$1" --no-git-tag-version --yes
#     cd - > /dev/null || exit
# done

# # Update versions in packages
# for dir in packages/*/; do
#     cd "$dir" || exit
#     pnpm version "$1" --no-git-tag-version --yes
#     cd - > /dev/null || exit
# done

# # get the new version
# VERSION=$(grep -m1 '"version":' apps/web/package.json | cut -d'"' -f4)
VERSION=$1

# Update version in apps/web/package.json
jq --arg version "$VERSION" '.version = $version' apps/web/package.json > tmp.json && mv tmp.json apps/web/package.json

# commit, tag and push
git add . 
git commit -m v$VERSION
git push
git tag -a "v${VERSION}" -m "v${VERSION}"
git push origin --tags 