// @TODO:
//  Start process that will listen on port & spawn `sam local invoke` on
//  incoming request, passing it the event in body, so it'll be simple to CURL
//  the address w/ event JSON in request body

/** @param {new (flags: Record<string, string>) => import("../main.mjs").Task} Task */
export function setup(Task) {
  return class TaskAwsSamLocal extends Task {
    static Command = "aws-sam-local";

    // @TODO: WIP
    flags = { "dry-run": true };

    async run() {
      this.$`sam local invoke --help`;
    }
  };
}
