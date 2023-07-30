import SharedIniFileLoader from "@aws-sdk/shared-ini-file-loader";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";

/** @param {new (flags: Record<string, string>) => import("../main.mjs").Task} Task */
export async function setup(Task) {
  return class TaskAwsAssume extends Task {
    static Command = "aws-assume";
    static EnvKeys = {
      Profile: "AWS_DEFAULT_PROFILE",
    };

    /**
     * @type {string}
     */
    profile;

    async run() {
      await this.init();
      await this.assume();
    }
    async init() {
      if (!this.flags.has("profile")) {
        throw new Error('Missing "profile" flag');
      }

      const { configFile, credentialsFile } =
        await SharedIniFileLoader.loadSharedConfigFiles();

      this.profile =
        this.flags.get("profile") ?? process.env[TaskAwsAssume.EnvKeys.Profile];
      this.configFile = configFile;
      this.credentialsFile = credentialsFile;
      this.client = new STSClient({
        region: this.configFile[this.profile].region,
      });

      return this;
    }
    async assume() {
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_SESSION_TOKEN;
      delete process.env.AWS_SECURITY_TOKEN;
      delete process.env.ASSUMED_ROLE;

      process.env.AWS_ACCESS_KEY_ID = String(
        this.credentialsFile[this.configFile[this.profile].source_profile]
          .aws_access_key_id
      );
      process.env.AWS_SECRET_ACCESS_KEY = String(
        this.credentialsFile[this.configFile[this.profile].source_profile]
          .aws_secret_access_key
      );

      try {
        const command = new AssumeRoleCommand({
          RoleArn: this.configFile[this.profile].role_arn,
          RoleSessionName: this.profile,
          DurationSeconds: 3600,
          SerialNumber: this.configFile[this.profile].mfa_serial,
          TokenCode: await this.readInput("MFA Code:"),
        });
        const res = await this.client.send(command);

        process.env.ASSUMED_ROLE = this.profile;
        process.env.AWS_SESSION_TOKEN = res.Credentials.SessionToken;
        process.env.AWS_SECURITY_TOKEN = res.Credentials.SessionToken;

        // @TODO: Refresh on timeout
      } catch (err) {
        this.log(err);
      }
    }
  };
}
