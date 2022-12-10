import { flow } from "fp-ts/lib/function";
import { logResult, mapLinesToArray, readFromFile } from "../shared/utils";

const addToLastArray = (arr: string[][], s: string): string[][] =>
  arr.length === 0 ? [[s]] : [...arr.slice(0, -1), [...arr[arr.length - 1], s]];

const groupByEmptyString = (arr: string[]): string[][] =>
  arr.reduce(
    (acc, curr) => (curr === "" ? [...acc, []] : addToLastArray(acc, curr)),
    new Array<string[]>()
  );

const mapToSum = (arr: (string | number)[]): number =>
  arr.reduce((acc: number, curr) => acc + Number(curr), 0);

const getAllSums = (arr: string[][]): number[] => arr.map(mapToSum);

const getNMax =
  (n: number) =>
  (arr: number[]): number[] =>
    arr.sort((a, b) => b - a).slice(0, n);

const solutionFirstPart = flow(
  readFromFile,
  mapLinesToArray,
  groupByEmptyString,
  getAllSums,
  getNMax(1),
  logResult
);

const solutionSecondPart = flow(
  readFromFile,
  mapLinesToArray,
  groupByEmptyString,
  getAllSums,
  getNMax(3),
  mapToSum,
  logResult
);

solutionFirstPart(`${__dirname}/input/input.txt`);
solutionSecondPart(`${__dirname}/input/input.txt`);
