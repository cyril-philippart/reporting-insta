declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): {
      all(...values: unknown[]): unknown[];
      run(...values: unknown[]): unknown;
    };
  }
}
