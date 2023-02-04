import { flow, pipe } from "fp-ts/lib/function";
import {
  groupBy,
  isNotEmpty,
  logResult,
  mapLinesToArray,
  range,
  readFromFile,
} from "../shared/utils";
import * as A from "fp-ts/Array";
import { group } from "console";
import { second } from "fp-ts/lib/Reader";

type Point = [number, number];

type Measurement = {
  sensor: Point;
  beacon: Point;
};

type SegmentBoundaries = [number, number];

const manhattanDistance = ([x1, y1]: Point, [x2, y2]: Point): number =>
  Math.abs(x1 - x2) + Math.abs(y1 - y2);

const doesIntersect = (m: Measurement, rowY: number): boolean =>
  Math.abs(rowY - m.sensor[1]) <= manhattanDistance(m.sensor, m.beacon);

const intersectRow =
  (rowY: number) =>
  (m: Measurement): SegmentBoundaries | undefined =>
    doesIntersect(m, rowY)
      ? [
          m.sensor[0] -
            Math.abs(manhattanDistance(m.sensor, m.beacon)) +
            Math.abs(rowY - m.sensor[1]),
          m.sensor[0] +
            Math.abs(manhattanDistance(m.sensor, m.beacon)) -
            Math.abs(rowY - m.sensor[1]),
        ]
      : undefined;

const toMeasurement = (line: string): Measurement =>
  pipe(
    line,
    (s) =>
      s
        .match(/(x=-?\d+, y=-?\d+)/g)!
        .map(
          (s) => s.split(",").map((x) => parseInt(x.split("=")[1], 10)) as Point
        ),
    ([sensor, beacon]) => ({ sensor, beacon })
  );

enum SegmentBoundary {
  START,
  END,
}

const unionSegments = (segments: SegmentBoundaries[]): SegmentBoundaries[] =>
  pipe(
    segments
      .flatMap(([start, end]) => [
        { x: start, type: SegmentBoundary.START },
        { x: end, type: SegmentBoundary.END },
      ])
      .sort((a, b) => a.x - b.x)
      .reduce(
        (state, boundary) =>
          state.open === 0
            ? {
                open: 1,
                boundaries:
                  boundary.x === state.boundaries[state.boundaries.length - 1]
                    ? state.boundaries.slice(0, -1)
                    : [...state.boundaries, boundary.x],
              }
            : state.open === 1 && boundary.type === SegmentBoundary.END
            ? { open: 0, boundaries: [...state.boundaries, boundary.x] }
            : {
                open:
                  state.open +
                  (boundary.type === SegmentBoundary.START ? 1 : -1),
                boundaries: state.boundaries,
              },
        { open: 0, boundaries: [] as number[] }
      ).boundaries,
    groupBy(2)
  ) as SegmentBoundaries[];

const getLength = (segments: SegmentBoundaries[]): number =>
  segments.map(([start, end]) => end - start).reduce((a, b) => a + b, 0);

type SolutionStrategy = (sbs: SegmentBoundaries[]) => number;

const solution = (strategy: SolutionStrategy) =>
  flow(
    readFromFile,
    mapLinesToArray,
    A.map(toMeasurement),
    A.map(intersectRow(2000000)),
    A.filter(isNotEmpty),
    unionSegments,
    strategy,
    logResult
  );

const firstPartSolution = solution(getLength);
firstPartSolution(`${__dirname}/input/input.txt`);

const trim =
  (start: number, end: number) =>
  (segments: SegmentBoundaries[]): SegmentBoundaries[] =>
    segments.filter(([s, e]) => s < end && e > start);

const getEmptySpot = (segments: SegmentBoundaries[]): number | undefined =>
  segments.length === 2 ? ++segments[0][1] : undefined;

const findSpot =
  (matrixDim: number) =>
  (measurements: Measurement[]): Point =>
    range(0, matrixDim).reduce(
      (position, rowY) =>
        position
          ? position
          : pipe(
              measurements,
              A.map(intersectRow(rowY)),
              A.filter(isNotEmpty),
              unionSegments,
              trim(0, matrixDim),
              getEmptySpot,
              (colX) => (colX ? [colX, rowY] : undefined)
            ),
      undefined as Point | undefined
    )!;

const tuningFrequency = ([x, y]: Point): number => x * 4_000_000 + y;

const secondPartSolution = flow(
  readFromFile,
  mapLinesToArray,
  A.map(toMeasurement),
  findSpot(4_000_000),
  tuningFrequency,
  logResult
);

secondPartSolution(`${__dirname}/input/input.txt`);
