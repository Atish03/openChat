FROM ubuntu

RUN apt update
RUN apt -y install nginx curl websockify

ENV NODE_VERSION=16.13.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"

RUN npm install pm2@latest -g

RUN /etc/init.d/nginx start

COPY ./api/main /
COPY ./client /client
COPY ./myapp /etc/nginx/sites-available/
COPY ./nginx.conf /etc/nginx/

RUN cd /client && npm i

RUN ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/

CMD /etc/init.d/nginx restart && websockify -v -D :4008 :8008 && cd /client && pm2 start main.js && /main