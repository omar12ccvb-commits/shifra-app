FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
COPY system-readiness.js /usr/share/nginx/html/system-readiness.js
