# Rinha de BackEnd -> Redis + Bun

## Setting up
O objetivo aqui foi utilizar Redis como primary Database, seguindo as outras regras da rinhadebackend em uma aplicação Bun + Redis, sem cache e sem pools de conexões, escrevendo JSON direto no Redis.
Para rodar esse projeto basta baixar o repósitorio, criar a imagem Docker com o comando (de dentro do pasta do projeto):
```bash
build -t app/rinhabackend_bun .
```

## Running
Depois de criada a imagem docker, basta executar o docker compose:
```bash
docker-compose up
```

## Testing
Com o projeto rodando, basta executar os testes com o Gatling, que esta no repositório da Rinha [aqui](https://github.com/zanfranceschi/rinha-de-backend-2023-q3/tree/main)

Os resultados desse projeto estao [publicados aqui](https://thiagomagro.github.io/rinhabackend/resultados)

