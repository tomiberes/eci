import process from "node:process";

import { Spawner } from "../../../common/spawner.mjs";

/**
 * @typedef {import("../../../common/spawner.mjs").SpawnerThread} SpawnerThread
 */

/**
 * Interface for AWS specific & domain logic
 */
export class InvokeAwsLambda extends Spawner {
  static Defaults = {
    Event: "lambda-event.json",
    Handler: "lambda-handler.mjs,handler,true",
  };
  static EnvKeys = {
    Event: "AWS_LAMBDA_EVENT",
    Handler: "AWS_LAMBDA_HANDLER",
  };

  /**
   * @type {*}
   */
  event;
  /**
   * @type {SpawnerThread}
   */
  handler;

  static async run(Ctor = InvokeAwsLambda) {
    const i = await new Ctor().init();

    await i.run();
    process.exit();
  }

  /**
   * @param {*} eventDef event definition
   * @param {*} handlerDef handler function definition
   */
  async init(eventDef, handlerDef) {
    const event = await this.#defineEvent(
      String(
        eventDef ??
          process.env[InvokeAwsLambda.EnvKeys.Event] ??
          InvokeAwsLambda.Defaults.Event
      )
    );
    const handler = await this.#defineHandler(
      String(
        handlerDef ??
          process.env[InvokeAwsLambda.EnvKeys.Handler] ??
          InvokeAwsLambda.Defaults.Handler
      )
    );

    this.log("Using event:\n", this.formatJSON(event));
    this.event = event;
    this.handler = handler;
    this.jobs.push(...handler.jobs);

    return this;
  }
  /**
   * @returns {Promise<*>}
   *
   * @TODO Run in a worker thread
   * @TODO AWS Lambda context, plain object is used
   */
  async run() {
    let res;

    // Cannot use callback API when handler is executed in a thread,
    // function cannot be copied
    res = await this.handler.run(this.event, {});
    this.log("Handler response:\n", this.formatJSON(res));

    return res;
  }
  /**
   * @TODO Event as JSON string, not file path string
   *
   * @param {*} eventDef
   * @returns {Promise<*>}
   */
  async #defineEvent(eventDef) {
    if (typeof eventDef === "object") {
      return eventDef;
    }

    if (typeof eventDef === "string") {
      return JSON.parse(await this.readFile(eventDef));
    }

    this.log('Use: "sam local generate-event ..." for event definition');

    throw new Error("Missing event definition");
  }
  /**
   * @param {string} handlerDef JSON serialized Array of file name, exported
   *  function name, and debug flag
   * @returns {Promise<SpawnerThread>}
   */
  async #defineHandler(handlerDef) {
    const [filePath, fnName, debug] = handlerDef.split(",").map((val) => {
      const str = String(val).trim();

      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    });

    if (typeof filePath !== "string") {
      throw new Error("Invalid handler definition");
    }

    return this.thread({ filePath, fnName, debug }, process.env);
  }
}

if (InvokeAwsLambda.isMain(import.meta.url)) {
  InvokeAwsLambda.run();
}
