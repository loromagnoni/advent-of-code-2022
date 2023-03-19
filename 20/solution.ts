import { flow } from "fp-ts/lib/function";
import {
  getSum,
  logResult,
  mapLinesToArray,
  readFromFile,
} from "../shared/utils";

const toIndexed = (arr: (string | number)[]): [number, number][] =>
  arr.map((k, i) => [i, Number(k)]);

const getNewIndex = (old: number, shift: number, max: number): number => {
  let d = (old + shift) % (max - 1);
  d += d < 0 ? -1 : 0;
  return (max + d) % max;
};

const moveItem = (
  indexed: [number, number][],
  toMove: [number, number]
): [number, number][] => {
  const toMoveIndex = indexed.reduce(
    (res, item, index) =>
      res !== undefined ? res : item[0] === toMove[0] ? index : undefined,
    undefined as undefined | number
  );
  const newIndex = getNewIndex(toMoveIndex!, toMove[1], indexed.length);
  const removed = indexed.filter(([index]) => index !== toMove[0]);
  return [...removed.slice(0, newIndex), toMove, ...removed.slice(newIndex)];
};

const findByIndex = (
  indexed: [number, number][],
  index: number
): [number, number] => indexed.find((item) => item[0] === index)!;

const order = (indexed: [number, number][]): [number, number][] =>
  indexed.reduce(
    (arr, _, index) => moveItem(arr, findByIndex(arr, index)),
    indexed
  );

const removeIndexes = (indexed: [number, number][]): number[] =>
  indexed.map(([, value]) => value);

const takeNValueAfterZero =
  (arr: number[]) =>
  (count: number): number => {
    const indexOfZero = arr.findIndex((i) => i === 0);
    return arr[(indexOfZero + count) % arr.length];
  };

const takeValuesAfterZero = (arr: number[]) =>
  [1000, 2000, 3000].map(takeNValueAfterZero(arr));

const solution = (
  strategy: (indexed: [number, number][]) => [number, number][]
) =>
  flow(
    readFromFile,
    mapLinesToArray,
    toIndexed,
    strategy,
    removeIndexes,
    takeValuesAfterZero,
    getSum,
    logResult
  );

const firstPartSolution = solution(order);
firstPartSolution(`${__dirname}/input/input.txt`);

const multiplyDecryptionKey = (
  indexed: [number, number][]
): [number, number][] => indexed.map(([i, v]) => [i, v * 811589153]);

const orderTimes =
  (times: number) =>
  (arg: [number, number][]): [number, number][] =>
    Array.from({ length: times }).reduce(order, arg);

const secondPartSolution = solution(
  flow(multiplyDecryptionKey, orderTimes(10))
);

secondPartSolution(`${__dirname}/input/input.txt`);
