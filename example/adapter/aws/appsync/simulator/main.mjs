import path from "node:path";
import url from "node:url";

import {
  AmplifyAppSyncSimulatorAuthenticationType,
  AppSyncSimulatorDataSourceType,
  RESOLVER_KIND,
} from "@aws-amplify/amplify-appsync-simulator";

import { InvokeAwsAppSyncSimulator } from "../../../../../src/adapter/aws/appsync/simulator/main.mjs";

/**
 * @typedef {import("@aws-amplify/amplify-appsync-simulator").AmplifyAppSyncSimulatorConfig} AppSyncSimulatorConfig
 */

export class ExampleAwsAppSyncApi extends InvokeAwsAppSyncSimulator {
  async init() {
    const dirPath = path.dirname(url.fileURLToPath(import.meta.url));
    /**
     * Configuration definition reference
     *
     * @type {AppSyncSimulatorConfig}
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const config = {
      appSync: {
        name: this.name,
        defaultAuthenticationType: {
          authenticationType: AmplifyAppSyncSimulatorAuthenticationType.AWS_IAM,
        },
        additionalAuthenticationProviders: [],
      },
      schema: {
        content: await this.readFile(dirPath + "/schemas/schema.gql"),
      },
      mappingTemplates: [
        {
          path: "request",
          content: await this.readFile(dirPath + "/templates/request.vtl"),
        },
        {
          path: "response",
          content: await this.readFile(dirPath + "/templates/response.vtl"),
        },
      ],
      dataSources: [
        {
          name: "QueryEntityListDataSource",
          type: AppSyncSimulatorDataSourceType.Lambda,
          invoke: (await import(dirPath + "/handlers/get-entity-list.mjs"))
            .handler,
        },
      ],
      resolvers: [
        {
          kind: RESOLVER_KIND.UNIT,
          typeName: "Query",
          fieldName: "getEntityList",
          // Ref: "dataSources[i].name"
          dataSourceName: "QueryEntityListDataSource",
          // Ref: "mappingTemplates[i].path"
          requestMappingTemplateLocation: "request",
          // Ref: "mappingTemplates[i].path"
          responseMappingTemplateLocation: "response",
        },
      ],
    };

    await super.init(
      undefined,
      undefined,
      process.env.AWS_APPSYNC_CONF ?? config
    );

    return this;
  }
}

// Comment out to use `#defineConfig` override
process.env.AWS_APPSYNC_CONF = "./config.json";

ExampleAwsAppSyncApi.run(ExampleAwsAppSyncApi);
