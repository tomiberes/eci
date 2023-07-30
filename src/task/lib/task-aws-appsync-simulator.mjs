import { InvokeAwsAppSyncSimulator } from "../../adapter/aws/appsync/simulator/main.mjs";

/** @param {new (flags: Record<string, string>) => import("../main.mjs").Task} Task */
export function setup(Task) {
  return class TaskAwsAppSyncSimulator extends Task {
    static Command = "aws-appsync-simulator";

    async run() {
      const i = new InvokeAwsAppSyncSimulator();

      await i.init(
        this.flags.get("http-port"),
        this.flags.get("ws-port"),
        this.flags.get("config")
      );
      await i.run();
      this.jobs.push(...i.jobs);
      this.log("Listening on port:", i.httpPort);
    }
  };
}
