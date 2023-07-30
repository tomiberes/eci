import { InvokeAwsLambda } from "../../adapter/aws/lambda/main.mjs";

/** @param {new (flags: Record<string, string>) => import("../main.mjs").Task} Task */
export function setup(Task) {
  return class TaskAwsLambda extends Task {
    static Command = "aws-lambda";

    async run() {
      const i = new InvokeAwsLambda();

      await i.init(this.flags.get("event"), this.flags.get("handler"));
      await i.run();
      await i.stop();
    }
  };
}
