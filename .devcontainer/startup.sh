#!/bin/bash

# Start MongoDB
service mongodb start

# Lerna bootstrap
yarn install
echo 'y' | yarn lerna clean
yarn lerna bootstrap

# Building packages
yarn lerna run build --scope=@courselit/rich-text
yarn lerna run build --scope=@courselit/components-library
yarn lerna run build --scope=@courselit/common-widgets
yarn lerna run build --scope=@courselit/widget-buttondown