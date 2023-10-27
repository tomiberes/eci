import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import os from "node:os";
import readline from "node:readline";
import url from "node:url";

import { Spawner } from "../common/spawner.mjs";

/**
 * @typedef {import("child_process").ChildProcess | { kill: (signal: string) => void}} Job
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export class Task extends Spawner {
  /**
   * CLI command scope
   *
   * @type {string}
   */
  static Command;

  /**
   * CLI flags after the command scope
   *
   * - "dry-run" - Convention to verify the task options
   *
   * @type {Map<string, ReturnType<typeof JSON.parse>>}
   */
  flags = new Map([["dry-run", false]]);
  /**
   * Execution priority, lower better, determined by CLI commands order
   *
   * @type {number}
   */
  index;

  /**
   * @param {Map<string, ReturnType<typeof JSON.parse>>} flags
   */
  constructor(flags = new Map()) {
    super();
    this.flags = new Map([...this.flags, ...flags]);
  }

  /**
   * Read input for question
   * @TODO Handle errors?
   *
   * @returns {Promise<string>}
   */
  async readInput(question) {
    return new Promise((resolve, _reject) => {
      rl.question(`${this.scope} ${question}`, resolve);
    });
  }
  async spawn(cmd, { args = [], opts = {}, exec = true } = {}) {
    if (this.flags["dry-run"]) {
      return this.log("Dry run of: ", cmd, args, opts, exec);
    }

    super.spawn(cmd, { args, opts, exec });
  }
}

export class TaskRunner {
  static FlagPrefix = "-";
  static KeyValSeparator = "=";
  static RegExpLeadingHypens = /^[\s-]+/;
  static RootCommand = "root";
  /**
   * @TODO Variable value type annotation
   */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  static RootFlags = new Map([
    // Using path segments
    ["env", [".env"]],
    ["task-dir", []],
    // Do not load tasks that are included in the package
    ["omit-lib", false],
  ]);
  static TaskExt = ".mjs";
  static TaskPrefix = "task-";

  static log(...msg) {
    // eslint-disable-next-line no-console
    console.log(`[${TaskRunner.name}]`, ...msg);
  }
  static check() {
    const minVer = 14;

    if (Number(process.versions.node.split(".")[0]) < minVer) {
      throw new Error(
        `Node.js v${minVer} is required, current version ${process.version}`
      );
    }
  }
  /**
   * Prefer an Array of path segments, to avoid dealing w/ OS differences
   */
  static path(segments = []) {
    const root = process.cwd();
    const dest = Array.isArray(segments) ? path.join(...segments) : segments;

    return path.isAbsolute(dest)
      ? path.resolve(dest)
      : path.resolve(root, dest);
  }
  static commands(args = []) {
    let current = String(TaskRunner.RootCommand);
    const commands = new Map([[current, []]]);

    for (const arg of args) {
      if (arg.length === 0) {
        continue;
      }

      if (!arg.startsWith(TaskRunner.FlagPrefix) && !commands.has(arg)) {
        current = arg;
        commands.set(current, []);
      } else if (!arg.endsWith(TaskRunner.FlagPrefix)) {
        commands.get(current)?.push(arg);
      }
    }

    return commands;
  }
  static flags(args = []) {
    return args.reduce((acc, curr) => {
      // Format: "-(-)truthy" or "-(-)some-named=value"
      let [key, val] = curr.trim().split(TaskRunner.KeyValSeparator);

      key = key.toLowerCase();

      if (!key.startsWith(TaskRunner.FlagPrefix)) {
        return acc;
      }

      key = key.replace(TaskRunner.RegExpLeadingHypens, "");

      // Use missing value as truthy flag
      if (typeof val === "undefined") {
        val = true;
      } else {
        try {
          val = JSON.parse(val);
        } catch {
          // noop
        }
      }

      acc.set(key, val);

      return acc;
    }, new Map());
  }
  static options() {
    const commands = TaskRunner.commands(process.argv.slice(2));
    const flags = new Map([
      ...TaskRunner.RootFlags,
      ...TaskRunner.flags(commands.get(TaskRunner.RootCommand)),
    ]);

    return { commands, flags };
  }
  static async env(filePath) {
    try {
      await fsp.access(filePath, fsp.constants.F_OK);
    } catch {
      return TaskRunner.log('Skip environment setup, no ".env" file');
    }

    const envFile = await fsp.readFile(filePath);

    for (const line of envFile.toString().split("\n")) {
      // Format: "SOME_NAMED=value"
      const [key, val] = line.trim().split(TaskRunner.KeyValSeparator);

      // @TODO: Skip `JSON.parse()` env vars should always be a string anyway
      process.env[key] = val;
    }
  }
  static async load(tasksDir) {
    const taskFileNames = (await fsp.readdir(TaskRunner.path(tasksDir))).filter(
      (n) =>
        n.startsWith(TaskRunner.TaskPrefix) && n.endsWith(TaskRunner.TaskExt)
    );
    const taskMods = await Promise.all(
      taskFileNames.map((n) =>
        import(url.pathToFileURL(TaskRunner.path([tasksDir, n])).toString())
      )
    );

    // The "Task" interface, each module has to export "setup" fn,
    // that receives a Task constructor, and returns a Task subclass constructor
    return Promise.all(taskMods.map((m) => m.setup(Task)));
  }
  static async setup() {
    const { commands, flags } = TaskRunner.options();
    const commandKeys = Array.from(commands.keys());
    const envFilePath = TaskRunner.path(flags.get("env"));
    const omitLib = flags.get("omit-lib");
    const taskDir = flags.get("task-dir");

    TaskRunner.log('Use ".env" file:', envFilePath);
    await TaskRunner.env(envFilePath);

    /**
     * @type typeof Task[]
     */
    const Tasks = [];
    const tasks = [];

    if (!omitLib) {
      try {
        const dirPath = path.resolve(
          path.dirname(url.fileURLToPath(import.meta.url)),
          "lib"
        );

        await fsp.access(dirPath, fsp.constants.F_OK);

        TaskRunner.log('Load local tasks "lib" dir');
        Tasks.push(...(await TaskRunner.load(dirPath)));
      } catch {
        TaskRunner.log('No local tasks "lib" dir');
      }
    }

    for (const dir of Array.isArray(taskDir) ? taskDir : [taskDir]) {
      TaskRunner.log("Load tasks dir:", dir);
      Tasks.push(...(await TaskRunner.load(dir)));
    }

    for (const T of Tasks) {
      if (!commands.has(T.Command)) {
        continue;
      }

      const t = new T(TaskRunner.flags(commands.get(T.Command)));

      if (!(t instanceof Task)) {
        throw new Error("Setup has to return an instance of " + Task.name);
      }

      t.index = commandKeys.indexOf(T.Command);
      tasks.push(t);
    }

    tasks.sort((a, b) => (a.index < b.index ? -1 : 1));

    return tasks;
  }
  static async run() {
    try {
      TaskRunner.check();

      const tasks = await TaskRunner.setup();

      for (const t of tasks) {
        await t.run();
      }

      return TaskRunner.done(
        tasks,
        tasks.find((t) => t.jobs.length > 0) != null
      );
    } catch (err) {
      TaskRunner.log(err.stack);
    }
  }
  static async done(tasks = [], watch = false) {
    if (watch) {
      // Handle Ctrl-C on Windows
      if (os.platform() === "win32") {
        rl.on("SIGINT", () => process.emit("SIGINT"));
      }

      // Keep reading stdin
      process.stdin.resume();
      process.on("SIGINT", async () => await TaskRunner.stop(tasks));
    } else {
      await TaskRunner.stop(tasks);
    }
  }
  static async stop(tasks = []) {
    try {
      await Promise.all(tasks.map((t) => t.stop()));

      process.exit(0);
    } catch (err) {
      TaskRunner.log(err.stack);
      process.exit(1);
    }
  }
}

if (Task.isMain(import.meta.url)) {
  TaskRunner.run();
}
