import * as fs from "fs";

export const readFromFile = (fileName: string): string => {
  return fs.readFileSync(fileName).toString();
};

export const mapLinesToArray = (s: string): string[] => {
  return s.split("\n");
};

export const logResult = (obj: unknown): any => {
  console.log(JSON.stringify(obj, null, 4));
  return obj;
};
