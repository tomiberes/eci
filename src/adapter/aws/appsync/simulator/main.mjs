import path from "node:path";
import process from "node:process";

import {
  AmplifyAppSyncSimulator,
  AmplifyAppSyncSimulatorAuthenticationType,
} from "@aws-amplify/amplify-appsync-simulator";

import { Spawner } from "../../../../common/spawner.mjs";

/**
 * @typedef {import("@aws-amplify/amplify-appsync-simulator").AmplifyAppSyncSimulatorConfig} AppSyncSimulatorConfig
 */

export class InvokeAwsAppSyncSimulator extends Spawner {
  static Defaults = {
    PortHTTP: 4000,
    PortWS: 4001,
    Config: "simulator-config.json",
  };
  static EnvKeys = {
    PortHTTP: "AWS_APPSYNC_PORT_HTTP",
    PortWS: "AWS_APPSYNC_PORT_WS",
    Config: "AWS_APPSYNC_CONF",
  };

  name = "api-local";
  /**
   * @type {number}
   */
  httpPort;
  /**
   * @type {number}
   */
  wsPort;
  /**
   * @type {AppSyncSimulatorConfig}
   */
  config;

  static async run(Ctor = InvokeAwsAppSyncSimulator) {
    const i = await new Ctor().init();

    await i.run();
    i.log("Listening on port:", i.httpPort);
  }

  /**
   * @param {number | void} httpPort
   * @param {number | void} wsPort
   * @param {*} configDef configuration source
   */
  async init(httpPort, wsPort, configDef) {
    const config = await this.#defineConfig(
      String(
        configDef ??
          process.env[InvokeAwsAppSyncSimulator.EnvKeys.Config] ??
          InvokeAwsAppSyncSimulator.Defaults.Config
      )
    );

    this.httpPort = Number(
      httpPort ??
        process.env[InvokeAwsAppSyncSimulator.EnvKeys.PortWS] ??
        InvokeAwsAppSyncSimulator.Defaults.PortHTTP
    );
    this.wsPort = Number(
      wsPort ??
        process.env[InvokeAwsAppSyncSimulator.EnvKeys.PortHTTP] ??
        InvokeAwsAppSyncSimulator.Defaults.PortHTTP
    );
    this.log("Using config:\n", this.formatJSON(config));
    this.config = config;

    return this;
  }
  async run() {
    this.instance = new AmplifyAppSyncSimulator({
      port: this.httpPort,
      wsPort: this.wsPort,
    });
    this.instance.init(this.config);
    this.jobs.push({
      kill: async () => this.instance.stop(),
    });
    await this.instance.start();
  }
  /**
   * @param {AppSyncSimulatorConfig | string} configDef
   * @returns {Promise<AppSyncSimulatorConfig>}
   */
  async #defineConfig(configDef) {
    // Direct config definition
    if (typeof configDef === "object") {
      return configDef;
    }

    // Config JSON file path
    if (typeof configDef === "string") {
      return this.#loadConfig(configDef);
    }
  }
  /**
   * Configuration definition from a JSON file
   *
   * @param {string} configPath
   * @returns {Promise<AppSyncSimulatorConfig>}
   */
  async #loadConfig(configPath) {
    const dirPath = path.dirname(configPath);
    const {
      additionalAuthenticationProviders,
      schema,
      mappingTemplates,
      dataSources,
      resolvers,
      ...rest
    } = JSON.parse(await this.readFile(configPath));

    return {
      appSync: {
        name: this.name,
        defaultAuthenticationType: {
          authenticationType: AmplifyAppSyncSimulatorAuthenticationType.AWS_IAM,
        },
        additionalAuthenticationProviders:
          additionalAuthenticationProviders ?? [],
      },
      schema: {
        content: await this.readFile(path.join(dirPath, schema.content)),
      },
      mappingTemplates: await Promise.all(
        mappingTemplates.map(async (mt) => {
          return {
            ...mt,
            content: await this.readFile(path.join(dirPath, mt.content)),
          };
        })
      ),
      // Ref: "dataSources[i].invoke" have to be defined as an Array of
      // file name, exported function name and debug flag
      dataSources: await Promise.all(
        dataSources.map(async (ds) => {
          const [filePath, fnName, debug] = ds.invoke;

          return {
            ...ds,
            invoke: await this.#defineHandler(
              path.join(dirPath, filePath),
              fnName,
              debug
            ),
          };
        })
      ),
      // Ref: "resolvers" have to be defined
      resolvers,
      ...rest,
    };
  }
  /**
   * @param {string} filePath script location
   * @param {string} fnName exported function
   * @param {boolean} debug
   * @returns {Promise<*>}
   *
   * @TODO Run in a worker thread
   * @TODO AWS Lambda context, plain object is used
   * @TODO Only `AppSyncSimulatorDataSourceType.Lambda` is supported
   */
  async #defineHandler(filePath, fnName, debug = false) {
    if (typeof filePath !== "string") {
      throw new Error("Invalid event definition");
    }

    const handler = await this.thread({ filePath, fnName, debug }, process.env);

    this.jobs.push(...handler.jobs);

    return async (event) => {
      this.log(
        "Invoke handler:",
        `"${filePath}:${fnName}"`,
        "for event:\n",
        this.formatJSON(event)
      );

      const res = await handler.run(event);

      this.log("Handler response:\n", this.formatJSON(res));

      return res;
    };
  }
}

if (InvokeAwsAppSyncSimulator.isMain(import.meta.url)) {
  InvokeAwsAppSyncSimulator.run();
}
