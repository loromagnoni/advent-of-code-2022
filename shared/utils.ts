import * as fs from "fs";

export const readFromFile = (fileName: string): string => {
  return fs.readFileSync(fileName).toString();
};

export const mapLinesToArray = (s: string): string[] => {
  return s.split("\n").filter((l) => !!l);
};

export const logResult = (obj: unknown): any => {
  if (typeof obj === "string") console.log(obj);
  else console.log(JSON.stringify(obj, null, 4));
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
