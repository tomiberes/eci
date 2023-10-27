import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import url from "node:url";

/**
 * @typedef {import("child_process").ChildProcess | { kill: (signal: string | void) => void}} Job
 *
 * @typedef {Object} FnDef
 * @prop {string} filePath
 * @prop {string} fnName
 * @prop {boolean} debug
 */

export class Invoke {
  /**
   * List of running jobs
   *
   * @type {Job[]}
   */
  jobs = [];

  get scope() {
    return `[${this.constructor.name}]`;
  }

  /**
   * @param {string} fileURL
   * @returns
   */
  static isMain(fileURL) {
    return fileURL === url.pathToFileURL(process.argv[1]).toString();
  }

  /**
   * Log with scope
   *
   * @param {*} msg
   * @returns void
   */
  log(...msg) {
    // eslint-disable-next-line no-console
    console.log(this.scope, ...msg);
  }
  /**
   * @param {*} data JSON serializable
   */
  formatJSON(data) {
    return JSON.stringify(data, null, 2);
  }
  /**
   * @abstract Optional, async & accepts options for initial setup
   *
   * @param {*} _opts
   */
  async init(..._opts) {
    return this;
  }
  /**
   * @abstract Does not accept options
   */
  async run() {
    return this.log(new Error('Missing "run" method implementation').stack);
  }
  /**
   * Kill all running jobs
   * @param {*} signal
   * @returns Promise<unknown[]>
   */
  async stop(signal) {
    return Promise.all(this.jobs.map((j) => j.kill(signal)));
  }
  /**
   * @param {string} filePath
   * @returns {Promise<string>}
   */
  async readFile(filePath) {
    return fsp.readFile(
      path.isAbsolute(filePath)
        ? path.resolve(filePath)
        : path.resolve(process.cwd(), filePath),
      "utf8"
    );
  }
  /**
   * Load function code into the current process realm
   *
   * @param {FnDef} fnDef
   * @return {Promise<(...args: unknown[]) => *>}
   */
  async loadFn(fnDef) {
    const { filePath, fnName, debug } = fnDef;

    const mod = await import(url.pathToFileURL(filePath).toString());
    let fn;

    if (fnName === "default" || fnName == null) {
      fn = mod["default"];
    } else {
      fn = mod[fnName];
    }

    return async (...args) => {
      if (debug) {
        // eslint-disable-next-line no-debugger
        debugger;
      }

      return fn(...args);
    };
  }
}
