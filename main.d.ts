type Callback = (...args: any[]) => any;
type OmitLast<T extends any[]> = T extends [...infer Rest, any] ? Rest : never;

export class KeyCollector<T extends string> {
  constructor(keys: T[]);
  signal(value: AbortSignal): this;
  set(key: T, value: any): boolean;
  then: Promise<any>["then"];
  reassign<T extends string>(keys: T[]): KeyCollector<T>;
  take<C extends Callback>(key: T, callback: C, ...args: OmitLast<Parameters<C>>): this;
  wait(key: T, promise: Promise<any>): this;
  all(dataset: Partial<Record<T, Promise<any>>>): this;
  get collected(): boolean;
  get failed(): boolean;
  static from<T extends string>(keys: T[]): KeyCollector<T>;
}
