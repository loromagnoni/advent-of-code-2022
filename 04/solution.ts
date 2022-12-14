import { flow, pipe } from "fp-ts/lib/function";
import * as R from "fp-ts/lib/ReadonlyArray";
import * as S from "fp-ts/lib/string";
import { logResult, mapLinesToArray, readFromFile } from "../shared/utils";

type Boundary = {
  readonly start: number;
  readonly end: number;
};

const boundaryFromString = (s: string): Boundary =>
  pipe(s, S.split("-"), R.map(parseInt), ([start, end]) => ({ start, end }));

const mapToBoundaryTuple = (s: string): [Boundary, Boundary] =>
  pipe(s, S.split(","), R.map(boundaryFromString), R.toArray) as [
    Boundary,
    Boundary
  ];

type OverlapStrategy = (arr: [Boundary, Boundary]) => boolean;

const solution = (overlapStrategy: OverlapStrategy) =>
  flow(
    readFromFile,
    mapLinesToArray,
    R.map(mapToBoundaryTuple),
    R.filter(overlapStrategy),
    R.size,
    logResult
  );

const firstPartOverlapStrategy: OverlapStrategy = ([
  a,
  b,
]: Boundary[]): boolean =>
  (a.start <= b.start && a.end >= b.end) ||
  (b.start <= a.start && b.end >= a.end);

const firstPartSolution = solution(firstPartOverlapStrategy);

firstPartSolution(`${__dirname}/input/input.txt`);

const secondPartStrategy: OverlapStrategy = ([a, b]) =>
  Math.min(a.end, b.end) >= Math.max(a.start, b.start);

const secondPartSolution = solution(secondPartStrategy);
secondPartSolution(`${__dirname}/input/input.txt`);
