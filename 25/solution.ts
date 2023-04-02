import * as A from "fp-ts/lib/Array";
import { flow } from "fp-ts/lib/function";
import {
  getSum,
  logResult,
  mapLinesToArray,
  readFromFile,
} from "../shared/utils";

const toDecimal = (snafu: string): number =>
  snafu
    .split("")
    .reverse()
    .map(
      (char, index) =>
        ({ "2": 2, "1": 1, "0": 0, "-": -1, "=": -2 }[char]! * 5 ** index)
    )
    .reduce((acc, curr) => acc + curr, 0);

const getHigher5Power = (decimal: number): number => {
  let power = 0;
  while (5 ** power <= decimal) {
    power++;
  }
  return power - 1;
};

const getLeastHigherChar = (
  arr: string[],
  target: number,
  index: number
): string =>
  arr
    .slice(1)
    .reduce((res, lower) => (toDecimal(lower) < target ? res : lower), arr[0])
    .charAt(index);

const increaseMaxPower = (snafu: string): string =>
  "2".repeat(snafu.length + 1);

const getLowerVariations = (
  snafu: string,
  suffix: string,
  index: number,
  char: string
): string[] => {
  const chars = ["2", "1", "0", "-", "="];
  return chars
    .slice(chars.findIndex((c) => c === char))
    .map((char) => suffix + char + snafu.slice(index + 1));
};

const toSNAFU = (decimal: number): string => {
  let snafu = "0";
  while (toDecimal(snafu) < decimal) snafu = increaseMaxPower(snafu);
  return snafu
    .split("")
    .reduce(
      (res, char, index) =>
        res +
        getLeastHigherChar(
          getLowerVariations(snafu, res, index, char),
          decimal,
          index
        ),
      ""
    );
};

const solution = flow(
  readFromFile,
  mapLinesToArray,
  A.map(toDecimal),
  getSum,
  toSNAFU,
  logResult
);

solution(`${__dirname}/input/input.txt`);
