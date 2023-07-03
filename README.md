# eci

Tools for services development

### Name

```js
> "service".split("").reverse().slice(0, 3).join("")
'eci'
```

### Task

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

### WIP

- `build:bundle` is an experiment
