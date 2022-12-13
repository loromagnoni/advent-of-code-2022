//for each pach
//get priority of item shared
// - split the string in two
// - create a map of the first array and check all of the second ones in the first one
// - if match return char
// - convert char to priority
//sum all priorities

import * as A from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import { flow, pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import {
  logResult,
  mapLinesToArray,
  readFromFile,
  trace,
} from "../shared/utils";

const halveString = (s: string): E.Either<string, [string, string]> =>
  pipe(
    E.Do,
    E.bind("length", () => E.of(s.length)),
    E.filterOrElse(
      ({ length }) => length % 2 === 0,
      () => "String length is not even"
    ),
    E.map(({ length }) => [s.slice(0, length / 2), s.slice(length / 2)])
  );

const getSharedItem = (groups: string[]): O.Option<string> =>
  pipe(
    O.Do,
    O.bind("charMap", () =>
      O.of(
        groups.reduce((map, pack) => {
          new Set(pack.split("")).forEach((c) => (map[c] = (map[c] || 0) + 1));
          return map;
        }, {} as Record<string, number>)
      )
    ),
    O.map(
      ({ charMap }) =>
        Object.entries(charMap).filter(([_, v]) => v === groups.length)[0][0]
    )
  );

const getPriority = (char: string): O.Option<number> =>
  pipe(
    O.of(char.charCodeAt(0) - 96),
    O.filter(() => char.charCodeAt(0) > 96),
    O.alt(() => O.of(char.charCodeAt(0) - 64 + 26))
  );

const getSharedItemPriority = (rucksack: string): E.Either<string, number> => {
  return pipe(rucksack, halveString, getPriorityFromRucksacks);
};

const getPriorityFromRucksacks = flow(
  E.chain(
    flow(
      getSharedItem,
      E.fromOption(() => "cannot get item")
    )
  ),
  E.chain(
    flow(
      getPriority,
      E.fromOption(() => "cannot get priority")
    )
  )
);

const mapToPriorities =
  (strategy: PartStrategy) =>
  (arr: string[]): E.Either<string, number[]> =>
    pipe(arr, strategy, A.sequence(E.Applicative));

const getSum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const solution = (partStrategy: PartStrategy) =>
  flow(
    readFromFile,
    mapLinesToArray,
    mapToPriorities(partStrategy),
    E.map(getSum),
    logResult
  );

type PartStrategy = (fa: string[]) => E.Either<string, number>[];
const firstPartStrategy: PartStrategy = A.map(getSharedItemPriority);

const firstSolution = solution(firstPartStrategy);

firstSolution(`${__dirname}/input/input.txt`);

const groupItems =
  (n: number) =>
  <T>(arr: T[]): T[][] =>
    arr.reduce((groups, item, index) => {
      const groupIndex = Math.floor(index / n);
      groups[groupIndex] = [...(groups[groupIndex] || []), item];
      return groups;
    }, [] as T[][]);

const secondPartStrategy: PartStrategy = flow(
  groupItems(3),
  A.map(E.of),
  A.map(getPriorityFromRucksacks)
);

const secondSolution = solution(secondPartStrategy);
secondSolution(`${__dirname}/input/input.txt`);
