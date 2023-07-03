import childProcess from "node:child_process";
import path from "node:path";
import url from "node:url";
import { MessageChannel, Worker } from "node:worker_threads";

import { Invoke } from "./invoke.mjs";

/**
 * @typedef {import("../common/invoke.mjs").FnDef} FnDef
 */

/**
 * @TODO Naming
 */
export class Spawner extends Invoke {
  async stop() {
    return super.stop("SIGINT");
  }
  /**
   * Spawn a child process
   *
   * @param {string} cmd
   * @param {Object} config
   * @param {string[]} [config.args]
   * @param {boolean} [config.exec]
   * @param {import("child_process").SpawnOptions} [config.opts]
   * @returns {Promise<import("child_process").ChildProcess | import("child_process").SpawnSyncReturns | void>}
   */
  async spawn(cmd, { args = [], opts = {}, exec = true } = {}) {
    if (exec) {
      return childProcess.spawnSync(cmd, args, { stdio: "inherit", ...opts });
    }

    const job = childProcess.spawn(cmd, args, { stdio: "inherit", ...opts });

    this.jobs.push(job);

    return job;
  }
  /**
   * Shell-like workflow to spawn a child process:
   *   ```js
   *   this.$`ls -la`
   *   ```
   *
   * @param {TemplateStringsArray} strings
   * @param {*[]} values
   * @returns {Promise<import("child_process").ChildProcess | import("child_process").SpawnSyncReturns | void>}
   */
  async $(strings, ...values) {
    let str = "";

    for (const [i, s] of strings.entries()) {
      const val = values[i];

      str += s;

      if (val != null) {
        str += String(val);
      }
    }

    const [cmd, ...args] = str.split(" ");

    return this.spawn(cmd, { args });
  }
  /**
   * Spawn a child process
   *
   * @param {string} cmd
   * @param {Object} config
   * @param {string[]} [config.args]
   * @param {boolean} [config.exec]
   * @param {import("child_process").SpawnOptions} [config.opts]
   * @returns {Promise<import("child_process").ChildProcess | import("child_process").SpawnSyncReturns | void>}
   */
  /**
   * Load and run function code in a separate thread
   *
   * @param {FnDef} fnDef
   * @param {import("worker_threads").WorkerOptions['env']} env
   */
  async thread(fnDef, env) {
    const i = await new SpawnerThread().init(fnDef, env);

    this.jobs.push(...i.jobs);

    return i;
  }
}

/**
 * @TODO Naming
 */
export class SpawnerThread extends Invoke {
  /**
   * @type {Worker}
   */
  worker;

  /**
   * @param {FnDef} fnDef
   * @param {NodeJS.Dict<string> | typeof import("worker_threads").SHARE_ENV} env
   */
  async init(fnDef, env = {}) {
    this.worker = new Worker(
      path.resolve(
        path.dirname(url.fileURLToPath(import.meta.url)),
        "worker.mjs"
      ),
      {
        env,
        workerData: {
          fnDef,
        },
      }
    );
    this.jobs.push({
      kill: async () => {
        return this.worker.terminate();
      },
    });

    return this;
  }
  /**
   * @param {unknown[]} args
   */
  async run(...args) {
    return new Promise((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();

      port1.on("message", (value) => {
        if (value instanceof Error) {
          return reject(value);
        }

        resolve(value);
      });
      port1.on("error", reject);
      port1.on("exit", (code) => {
        if (code !== 0) {
          resolve(new Error(`Worker stopped with exit code ${code}`));
        }
      });

      this.worker.postMessage(
        {
          args,
          port: port2,
        },
        [port2]
      );
    });
  }
}
