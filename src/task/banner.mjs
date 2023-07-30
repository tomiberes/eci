#!/usr/bin/env node

/**
 * - Zero dependencies & OS independent project env/setup management script,
 *   for maximum portability. It only handles the environment and the process
 *   orchestration. The implementation is intentionally naive for simplicity,
 *   and simple troubleshooting.
 *   - To debug: `node --inspect-brk $(which task)`
 *   - ESModules are used for explicit dependency lookup, w/o CommonJS magic.
 *   - Tasks can have their own dependencies colocated within the project
 *     or globally within the target machine.
 *     - e.g. use `node-fetch` in local `node_modules`
 * - Requires:
 *   - "node" >= v14 - ESModules support
 * - Install:
 *   - POSIX:
 *     - `chmod u+x <path_to/task.mjs> <path_to_bin_dir>/task`
 *       - e.g. `chmod u+x ~/Developer/.tmp/task.mjs`
 *     - `ln -sf <path_to/task.mjs> <path_to_bin_dir>/task`
 *       - e.g. `ln -sf ~/Developer/.tmp/task.mjs ~/.local/bin/task`
 *   - Windows:
 *     - Create `task.cmd` which contains:
 *       ```
 *       @node <full_path_to>\task.mjs %*
 *       ```
 *     - Place it in directory which is inluded in "Path" lookup
 *       - To verify : "Win + r" -> "sysdm.cpl" -> "Advanced" ->
 *           "Environment Variables..."
 *     - Refresh PowerShell `$env:Path`:
 *       - `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`
 *     - Verify:
 *       - `Get-ChildItem env:$Path`
 * - "Task" file example:
 *   - Naming: `tasks/task-<descriptive_task_name>.mjs`,
 *     - e.g. `tasks/task-exec.mjs`
 *   - Content example:
 *     ```js
 *     export async function setup(Task) {
 *       return class TaskNpm extends Task {
 *         // argv subcommand
 *         static Command = "npm";
 *
 *         // command & flags usage: `task npm -args="ls -g"`
 *         async run(flags) {
 *           this.log(process.env);
 *
 *           return this.spawn("npm", { args: this.flags.args.split(" ") });
 *         }
 *       }
 *     }
 *     ```
 */
