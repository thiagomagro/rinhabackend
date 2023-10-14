import { Elysia } from "elysia";
import { AggregateSteps, AggregateGroupByReducers, createClient, SchemaFieldTypes } from 'redis';
import dayjs from 'dayjs';
import z from "zod";

const pessoaSchema = z.object({
  nome: z.string({
    required_error: "Nome é obrigatório",
    invalid_type_error: "Nome precisar ser string",
  }).min(1,"Nome é obrigatório"),
  apelido: z.string({
    required_error: "Apelido é obrigatório",
    invalid_type_error: "Apelido precisar ser string",
  }).min(1,"Apelido é obrigatório"),
  nascimento: z.number(),
  stack: z.array(z.string({ invalid_type_error: "Stack precisar ser string" }))
});

let redis_host="localhost";
if(process.env.NODE_ENV=="prod"){
  redis_host="host.docker.internal";
}

console.log('REDIS_HOST');
console.log(redis_host);

const client = createClient({
  socket: {
    host: redis_host,
    port: 6379
  }
});

let special_chars = /[,.<>{}[\]"':;!@#\$%\^&*()\ -+=~]/g;
function escape_string(str) {
  return str.replace(special_chars, (el) => {
    return `\\${el}`;
  });
}

async function command(cmd_string) {
  // console.log(cmd_string.split(' '));
  console.log(await client.sendCommand(cmd_string.split(' ')));
}

async function command_json(cmd_string, json_string, cmd_string_end) {
  cmd_string = cmd_string.split(" ");
  // json_string = escape_string(json_string).split(" ");
  cmd_string = cmd_string.concat(json_string);

  if (cmd_string_end && cmd_string_end != "") {
    cmd_string_end = escape_string(cmd_string_end).split(" ");
    cmd_string.concat(cmd_string_end);
  }
  // console.log(cmd_string);
  // console.log(cmd_string.concat(json_string, cmd_string_end));
  client.sendCommand(cmd_string);
  // str.replace(/[^a-zA-Z ]/g, "")
}

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();
try {
  console.log(await client.ft.info("pessoa_idx"))
  console.log(await client.ft.dropIndex("pessoa_idx"))
} catch (e) {
  console.log(e);
}

try {
  // command_json()
  // command("FT.CREATE pessoa_idx ON JSON PREFIX 1 pessoa: SCHEMA $.id as id TEXT $.stack.* AS stack Text $.apelido AS apelido TEXT $.nome as nome TEXT $.nascimento as nascimento NUMERIC"); // 'OK'
  let idx = await client.ft.create('pessoa_idx', {
    '$.id': {
      type: SchemaFieldTypes.TEXT,
      AS: 'id'
    },
    '$.apelido': {
      type: SchemaFieldTypes.TEXT,
      AS: 'apelido'
    },
    '$.nome': {
      type: SchemaFieldTypes.TEXT,
      AS: 'nome'
    },
    '$.nascimento': {
      type: SchemaFieldTypes.NUMERIC,
      AS: 'nascimento'
    }
  }, {
    ON: 'JSON',
    PREFIX: 'pessoa:'
  });
  // console.log(idx);
} catch (e) {
  if (e.message === 'Index already exists') {
    console.log('Index exists already, skipped creation.');
  } else {
    // Something went wrong, perhaps RediSearch isn't installed...
    console.error(e);
    process.exit(1);
  }
}


const app = new Elysia()
  .get("/", () => "Hello Elysia")

app.get('/pessoas/:id', async ({ params: { id } }) => {
  // let pessoa = await client.sAdd('apelidos', body.apelido);
  console.log(`Get Pessoa ${id}`)
  // f4c7888c-6966-11ee-8b7f-daa61c5665de
  let pessoa = client.json.get(`pessoa:${id}`)
  pessoa.nascimento = dayjs(pessoa.nascimento).format('YYYY-MM-DD');
  return pessoa;
})

app.get('/contagem-pessoas', async () => {
  console.log("Contagem")
  let count = await client.sCard("apelidos");
  return count
});

app.get('/pessoas', async ({ query, set }) => {
  // console.log(query.t);
  if(!query.t || query.t.trim()==""){
    set.status = 400
    return;
  }
  let results = await client.ft.search(
    'pessoa_idx',
    `${query.t}`
  );
  return results.documents.map((e)=>{
    e.value.nascimento = dayjs(e.value.nascimento).format('YYYY-MM-DD');
    return e.value
  });
})

app.post('/pessoas', async ({ body, set }) => {
  let pessoa = body;
  pessoa.nascimento = dayjs(pessoa.nascimento).valueOf();

  let result = pessoaSchema.safeParse(pessoa);
  console.log(result.error)
  if (!result.success) {
    set.status = 422
    return;
  }

  let exists = await client.sAdd('apelidos', pessoa.apelido);
  if (exists == 0) {
    set.status = 422
    return;
  }
  pessoa.id = crypto.randomUUID();
  let idx = "pessoa:" + pessoa.id;
  console.log(pessoa)

  // let ret = await command_json(`JSON.SET pessoa:${pessoa.id} .`, JSON.stringify(pessoa));

  let ret = await client.json.set(idx, '$', {
    "id": pessoa.id,
    "nome": pessoa.nome,
    "apelido": pessoa.apelido,
    "nascimento": pessoa.nascimento,
    "stack": pessoa.stack
  })
  // console.log(ret);
  set.status = 201
  set.headers = {
    "location": `/pessoas/${pessoa.id}`
  }
  return;
})


app.listen(process.env.HTTP_PORT || 3000);

// app.listen({
//   port: parseInt(process.env.HTTP_PORT || '3000'),
//   hostname: process.env.HTTP_HOST || '0.0.0.0',
// });

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
