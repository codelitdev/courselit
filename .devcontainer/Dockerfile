FROM node

RUN apt-get update \
    && apt-get -y install git mongodb ffmpeg imagemagick webp \
    # 
    # Remove outdated yarn from /opt and install via package 
    # so it can be easily updated via apt-get upgrade yarn.
    # Code copied from https://github.com/microsoft/vscode-dev-containers/blob/v0.112.0/containers/javascript-node-12/.devcontainer/Dockerfile
    && rm -rf /opt/yarn-* \
    && rm -f /usr/local/bin/yarn \
    && rm -f /usr/local/bin/yarnpkg \
    && apt-get install -y curl apt-transport-https lsb-release debian-keyring debian-archive-keyring \
    && curl -sS https://dl.yarnpkg.com/$(lsb_release -is | tr '[:upper:]' '[:lower:]')/pubkey.gpg | apt-key add - 2>/dev/null \
    && echo "deb https://dl.yarnpkg.com/$(lsb_release -is | tr '[:upper:]' '[:lower:]')/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
    && apt-get update \
    && apt-get -y install --no-install-recommends yarn \
    && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | apt-key add - \
    && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee -a /etc/apt/sources.list.d/caddy-stable.list \
    && apt-get update \
    && apt-get -y install caddy \
    #
    # Clean up
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Install Stripe CLI
RUN wget https://github.com/stripe/stripe-cli/releases/download/v1.5.2/stripe_1.5.2_linux_amd64.deb -O stripe_cli.deb
RUN dpkg -i ./stripe_cli.deb

COPY startup.sh /usr/local/bin
RUN ln -s /usr/local/bin/startup.sh /
RUN echo 'alias api="yarn lerna run dev --scope=@courselit/api --stream"' >> ~/.bashrc
RUN echo 'alias app="yarn lerna run dev --scope=@courselit/app --stream"' >> ~/.bashrc
RUN echo 'alias stripe-listen="stripe listen --forward-to localhost:8000/payment/webhook"' >> ~/.bashrc
RUN ["chmod", "+x", "/usr/local/bin/startup.sh"]