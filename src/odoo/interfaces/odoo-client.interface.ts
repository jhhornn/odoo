export interface IOdooClient {
  methodCall(method: string, params: any[]): Promise<any>;
  authenticate(
    database: string,
    username: string,
    password: string,
  ): Promise<number>;
  execute(
    database: string,
    uid: number,
    password: string,
    model: string,
    method: string,
    args: any[],
    kwargs?: any,
  ): Promise<any>;
}
