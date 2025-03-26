## Description

Files API V1

## Instructions to run the project

### 1. Create .env file

Copy the .env.example and fill the required variables

```bash
cp .env.example .env
```
### 2. Build docker container

```bash
docker compose up --build
```

### 3. Use SWAGGER Documentation to test the API
The swagger documentation is served at:
```
http://localhost:3000/api
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
