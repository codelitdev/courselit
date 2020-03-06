if [ -z "$1" ]; then
    echo "Error: specify the Docker machine's name"
    exit 1
fi

eval $(docker-machine env $1 --shell bash)
docker-compose $2 down