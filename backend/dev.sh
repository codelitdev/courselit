#!/bin/bash

# This script starts the development environment in tmux

#"`/usr/bin/docker inspect -f {{.State.Running}} mongo`"!="true"
# until [ "true"="true" ]; do
#     sleep 0.1;
#     echo "sleeping..."
# done;
# echo "started"

tmux new-session -d 'docker-compose up'
tmux split-window -h 'yarn dev'
tmux split-window -v 'mongo mongodb://172.18.0.2:27017'
tmux split-window -v 'bash'
tmux -2 attach-session -d