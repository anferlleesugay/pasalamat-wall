# ---------- Stage 1: download dependencies (cached until pom.xml changes) ----------
FROM maven:3.9.9-eclipse-temurin-21 AS deps
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# ---------- Stage 2: run unit tests (Jenkins runs: docker build --target test) ----------
FROM deps AS test
COPY src ./src
RUN mvn -B test

# ---------- Stage 3: build the jar ----------
FROM deps AS build
COPY src ./src
RUN mvn -B -DskipTests package

# ---------- Stage 4: small runtime image ----------
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/target/*.jar app.jar
USER app
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:8080/health || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]