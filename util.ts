import * as ch from "child_process";

export const arrify = <T>(arr: T | T[]) => (Array.isArray(arr) ? arr : [arr]);

export type ExecResult = {
  stdout: string
  code: number | null
  stderr: string
}

export const execSync = (cmd: string, options: ch.ExecSyncOptions = {}) => {
  return ch.execSync(
    cmd,
    Object.assign(
      {
        stdio: "inherit"
      },
      options
    )
  );
};
