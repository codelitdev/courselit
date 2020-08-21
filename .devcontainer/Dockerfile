FROM node

RUN apt-get update \
    && apt-get -y install git mongodb ffmpeg imagemagick \
    # 
    # Remove outdated yarn from /opt and install via package 
    # so it can be easily updated via apt-get upgrade yarn.
    # Code copied from https://github.com/microsoft/vscode-dev-containers/blob/v0.112.0/containers/javascript-node-12/.devcontainer/Dockerfile
    && rm -rf /opt/yarn-* \
    && rm -f /usr/local/bin/yarn \
    && rm -f /usr/local/bin/yarnpkg \
    && apt-get install -y curl apt-transport-https lsb-release \
    && curl -sS https://dl.yarnpkg.com/$(lsb_release -is | tr '[:upper:]' '[:lower:]')/pubkey.gpg | apt-key add - 2>/dev/null \
    && echo "deb https://dl.yarnpkg.com/$(lsb_release -is | tr '[:upper:]' '[:lower:]')/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
    && apt-get update \
    && apt-get -y install --no-install-recommends yarn \
    #
    # Clean up
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

COPY startup.sh /usr/local/bin
RUN ln -s /usr/local/bin/startup.sh /
RUN ["chmod", "+x", "/usr/local/bin/startup.sh"]