# Usage: ./up.sh docker-machine-name your-env-file [docker-compose-build-option]

if [ -z "$1" ]; then
    echo "Error: specify the Docker machine's name"
    exit 1
fi

if [ -z "$2" ]; then
    echo "Error: specify an environment file"
    exit 1
fi

FILE=$2
if test -f "$FILE"; then
    cp $FILE .env
    eval $(docker-machine env $1)
    echo Deploying on $DOCKER_HOST
    docker-compose up -d
else
    echo "Error: $FILE does not exist"
    exit 1
fi