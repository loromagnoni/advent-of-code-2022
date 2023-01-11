import { flow } from "fp-ts/lib/function";
import {
  groupBy,
  logResult,
  mapLinesToArray,
  readFromFile,
} from "../shared/utils";

const toDeserialized = (lines: string[]): Item[] =>
  lines.map((l) => JSON.parse(l));

type Item = number | Array<Item>;

enum Result {
  RIGHT = "RIGHT",
  WRONG = "WRONG",
}

type CompareResult = { index: number; result: Result };

const areNumbers = (...arr: Item[]): boolean =>
  arr.every((i) => typeof i === "number");

const flatList = (item: Item | number): Array<Item> =>
  Array.isArray(item) ? item : [item];

const getNumberComparison = (
  first: number,
  second: number
): Result | undefined =>
  first === second ? undefined : first < second ? Result.RIGHT : Result.WRONG;

const compareLength = (
  first: Array<Item>,
  second: Array<Item>
): Result | undefined =>
  first.length === second.length
    ? undefined
    : first.length < second.length
    ? Result.RIGHT
    : Result.WRONG;

const getListComparison = (
  first: Array<Item>,
  second: Array<Item>
): Result | undefined =>
  first.reduce(
    (res, item, index) =>
      res
        ? res
        : index === second.length
        ? Result.WRONG
        : compare(item, second[index]),
    undefined as Result | undefined
  ) ?? compareLength(first, second);

const compare = (first: Item, second: Item): Result | undefined =>
  areNumbers(first, second)
    ? getNumberComparison(first as number, second as number)
    : getListComparison(flatList(first), flatList(second));

const compareLists = (couples: Item[][]): CompareResult[] =>
  couples.map(([first, second], index) => ({
    index: index + 1,
    result: compare(first, second)!,
  }));

const filterRights = (results: CompareResult[]): CompareResult[] =>
  results.filter((r) => r.result === Result.RIGHT);

const sumIndexes = (results: CompareResult[]): number =>
  results.reduce((acc, curr) => acc + curr.index, 0);

const solution = flow(
  readFromFile,
  mapLinesToArray,
  toDeserialized,
  groupBy(2),
  compareLists,
  filterRights,
  sumIndexes,
  logResult
);

solution(`${__dirname}/input/input.txt`);

const dividers: [Item, Item] = [[[2]], [[6]]];

const appendDividers = (items: Array<Item>): Array<Item> => [
  ...items,
  ...dividers,
];

const toSortIndex = (res: Result): number => (res === Result.RIGHT ? -1 : 1);

const sortPackets = (items: Array<Item>): Array<Item> =>
  items.sort((a, b) => toSortIndex(compare(a, b)!));

const getDecoderKey = (items: Array<Item>): number =>
  dividers
    .map((d) => items.findIndex((v) => v === d))
    .reduce((acc, i) => acc * ++i, 1);

const secondPartSolution = flow(
  readFromFile,
  mapLinesToArray,
  toDeserialized,
  appendDividers,
  sortPackets,
  getDecoderKey,
  logResult
);

secondPartSolution(`${__dirname}/input/input.txt`);
