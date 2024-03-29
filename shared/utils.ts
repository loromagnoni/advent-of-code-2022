import * as fs from "fs";

export const readFromFile = (fileName: string): string => {
  return fs.readFileSync(fileName).toString();
};

export const mapLinesToArray = (s: string): string[] => {
  return s.split("\n").filter((l) => !!l);
};

export const logResult = (obj: unknown): any => {
  if (typeof obj === "string") console.log(obj);
  else
    console.log(
      JSON.stringify(
        obj,
        (key, value) => (typeof value === "bigint" ? value.toString() : value),
        4
      )
    );
  return obj;
};

export const trace =
  <A>(label: string) =>
  (a: A): A => {
    console.log(`${label}: ${JSON.stringify(a)}`);
    return a;
  };

export const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => i + start);

export const groupBy =
  <T>(dim: number) =>
  (arr: T[]) =>
    arr.reduce(
      (acc, curr, i) =>
        i % dim
          ? [...acc.slice(0, -1), [...acc.slice(-1)[0], curr]]
          : [...acc, [curr]],
      [] as T[][]
    );

export const unique = <T>(arr: Array<T>): Array<T> => [...new Set(arr)];

export const isNotEmpty = <T>(a: T | undefined): a is T => !!a;

export const trampoline = <T>(f: () => T | (() => T)): T => {
  let result = f();
  while (typeof result === "function") result = (result as Function)();
  return result;
};

export const deepCopy = <T extends Object>(obj: T): T =>
  JSON.parse(JSON.stringify(obj));

export const logTimeCost = (label: string, fn: Function) => {
  console.time(label);
  const res = fn();
  console.timeEnd(label);
  return res;
};

export const getSum = (arr: number[]) => arr.reduce((acc, i) => acc + i, 0);
export const getProduct = (arr: number[]) =>
  arr.slice(1).reduce((acc, i) => acc * i, arr[0]);

export const timing = (fn: Function) => {
  console.time("timing");
  const res = fn();
  console.timeEnd("timing");
  return res;
};
