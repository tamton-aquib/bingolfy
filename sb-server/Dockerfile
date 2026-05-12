FROM maven:3-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml ./
RUN mvn dependency:go-offline -B
COPY src src
RUN mvn package -DskipTests -B
RUN mv target/*.jar app.jar

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/app.jar .
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
