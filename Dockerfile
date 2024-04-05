FROM node:20-alpine

WORKDIR /app
COPY . .

# Install dependencies and build the project
RUN npm install && \
    npm run build

# Install nginx
RUN echo "http://dl-4.alpinelinux.org/alpine/v3.3/main" >> /etc/apk/repositories && \
    apk add --no-cache --update nginx && \
    chown -R nginx:www-data /var/lib/nginx

COPY ./nginx.conf /etc/nginx/nginx.conf

FROM nginx
EXPOSE 8080
COPY ./nginx.conf /etc/nginx/nginx.conf
COPY ./build /usr/share/nginx/html
