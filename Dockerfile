FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/src ./src
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
RUN chmod +x /app/scripts/fly-start.sh
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["/app/scripts/fly-start.sh"]
