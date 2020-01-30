if [ -z "$1" ]; then
    echo "Error: specify the Docker machine's name"
    exit 1
fi

eval $("docker-machine.exe" env $1 --shell bash)
docker-compose.exe $2 down