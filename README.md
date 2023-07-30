# eci

Tools for services development

### `TaskRunner`

#### Root CLI API

- `-env`
  - Path string to pecifiy the location of ".env" file, default is invoke pwd
  - Default "./.env"
- `-task-dir`
  - Path string to specify location of `task-*.mjs` files to load and invoke
  - Default: "./tasks"
- `-omit-lib`
  - `true` | `false` - Omit loading tasks included in distribution
  - Default: `true`

#### Example

### `Task`

#### Command API

```sh
npm run task -- \
  aws-assume \
    -profile=<aws_role> \
```

```sh
npm run task -- \
  aws-appsync-simulator \
    -config="./example/adapter/aws/appsync/simulator/config.json"
```

```sh
npm run task -- \
  aws-lambda \
    -event="./example/adapter/aws/lambda/lambda-event.json" \
    -handler="./example/adapter/aws/lambda/lambda-handler.mjs,handler,true"
```

Tasks can be chained

```sh
npm run task -- \
  aws-assume \
    -profile=<aws_role> \
  aws-appsync-simulator \
    -config="./example/adapter/aws/appsync/simulator/config.json"
```

### TODO

- Narrow Node.js version
- Rename "task" to "act"?

### WIP

- `build:bundle` is an experiment

### Notes

#### Name

```js
> "service".split("").reverse().slice(0, 3).join("")
'eci'
```
