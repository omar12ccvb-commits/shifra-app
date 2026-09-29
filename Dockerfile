FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY index.html /usr/share/nginx/html/index.html
COPY system-readiness.js /usr/share/nginx/html/system-readiness.js
COPY push-notifications.js /usr/share/nginx/html/push-notifications.js
COPY sw.js /usr/share/nginx/html/sw.js
EXPOSE 80
