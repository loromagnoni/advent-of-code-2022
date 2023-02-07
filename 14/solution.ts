import { flow, pipe } from "fp-ts/lib/function";
import {
  logResult,
  mapLinesToArray,
  readFromFile,
  trampoline,
} from "../shared/utils";

type Point = [number, number];

const toVertexes = (lines: string[]): Point[][] =>
  lines.map(
    (input) =>
      input
        .split(" -> ")
        .map((point) => point.split(",").map((n) => parseInt(n))) as Point[]
  );

const verticalSegment = (x: number, y1: number, y2: number): Point[] =>
  Array.from({ length: Math.abs(y2 - y1) + 1 }, (_, i) => [
    x,
    Math.min(y1, y2) + i,
  ]);

const horizontalSegment = (y: number, x1: number, x2: number): Point[] =>
  Array.from({ length: Math.abs(x2 - x1) + 1 }, (_, i) => [
    Math.min(x1, x2) + i,
    y,
  ]);

const getSegment = ([x1, y1]: Point, [x2, y2]: Point): Point[] =>
  x1 === x2 ? verticalSegment(x2, y1, y2) : horizontalSegment(y2, x1, x2);

type PointMap = Record<number, Record<number, Point>>;

const insertPointInMap = (map: PointMap, point: Point) => {
  map[point[0]] = map[point[0]] || {};
  map[point[0]][point[1]] = point;
};

const expandToLines = (vertexGroups: Point[][]): PointMap =>
  vertexGroups
    .flatMap((vertexes) =>
      vertexes
        .slice(1)
        .reduce(
          (acc, v, i) => [...acc, ...getSegment(vertexes[i], v)],
          [] as Point[]
        )
    )
    .reduce((map, p) => {
      insertPointInMap(map, p);
      return map;
    }, {} as PointMap);

const canGoDown = (
  fixed: PointMap,
  position: Point,
  floorY: number | undefined
): boolean =>
  !fixed[position[0]]?.[position[1] + 1] && position[1] + 1 !== floorY;

const canGoLeft = (
  fixed: PointMap,
  position: Point,
  floorY: number | undefined
): boolean =>
  !fixed[position[0] - 1]?.[position[1] + 1] && position[1] + 1 !== floorY;

const canGoRight = (
  fixed: PointMap,
  position: Point,
  floorY: number | undefined
): boolean =>
  !fixed[position[0] + 1]?.[position[1] + 1] && position[1] + 1 !== floorY;

const maybeUp = (base: Point | undefined): Point | undefined =>
  base ? [base[0], base[1] - 1] : undefined;

const onFloor =
  ([x]: Point, floorY: number | undefined) =>
  (base: Point | undefined): Point | undefined =>
    base || !floorY ? base : [x, floorY - 1];

const firstDownPosition = (
  fixed: PointMap,
  position: Point,
  floorY: number | undefined
): Point | undefined =>
  pipe(
    Object.values(fixed[position[0]] ?? [])
      .filter(([x, y]) => x === position[0] && y > position[1])
      .sort((a, b) => a[1] - b[1])[0],
    maybeUp,
    onFloor(position, floorY)
  );

enum Movement {
  GO_DOWN,
  GO_LEFT,
  GO_RIGHT,
  STUCK,
  END,
}

const willFallForever = (point: Point | undefined): boolean =>
  typeof point === "undefined";
const hasFilledMap = (p: Point): boolean => p[0] === 500 && p[1] === 0;

const getNextMovement = (
  fixed: PointMap,
  position: Point | undefined,
  floorY: number | undefined
): Movement =>
  willFallForever(position)
    ? Movement.END
    : canGoDown(fixed, position!, floorY)
    ? Movement.GO_DOWN
    : canGoLeft(fixed, position!, floorY)
    ? Movement.GO_LEFT
    : canGoRight(fixed, position!, floorY)
    ? Movement.GO_RIGHT
    : Movement.STUCK;

const getNextPositionTracks = (
  fixed: PointMap,
  position: Point | undefined,
  floorY: number | undefined
) => ({
  [Movement.GO_DOWN]: () =>
    droppedPosition(fixed, firstDownPosition(fixed, position!, floorY), floorY),
  [Movement.GO_LEFT]: () =>
    droppedPosition(fixed, [position![0] - 1, position![1] + 1], floorY),
  [Movement.GO_RIGHT]: () =>
    droppedPosition(fixed, [position![0] + 1, position![1] + 1], floorY),
  [Movement.STUCK]: () => (hasFilledMap(position!) ? undefined : position),
  [Movement.END]: () => undefined,
});

const droppedPosition = (
  fixed: PointMap,
  position: Point | undefined,
  floorY: number | undefined
): Point | undefined =>
  getNextPositionTracks(fixed, position, floorY)[
    getNextMovement(fixed, position, floorY)
  ]();

type PourSand = (() => PourSand) | number;

const pourSand = (
  fixed: PointMap,
  floorY: number | undefined,
  iteration = 0
): PourSand => {
  const newPosition = droppedPosition(fixed, [500, 0], floorY);
  if (typeof newPosition === "undefined") return iteration + (floorY ? 1 : 0);
  insertPointInMap(fixed, newPosition);
  return () => pourSand(fixed, floorY, iteration + 1);
};

const getFloorY = (
  points: PointMap,
  distance: number | undefined
): number | undefined =>
  distance
    ? Object.values(points)
        .flatMap((column) => Object.values(column))
        .map(([, y]) => y)
        .sort((a, b) => a - b)
        .reverse()[0] + distance
    : distance;

const pourStandStackSafe =
  (floorDistance: number | undefined) => (points: PointMap) =>
    trampoline(
      () => pourSand(points, getFloorY(points, floorDistance)) as number
    );

const solution = (floorDistance = undefined as number | undefined) =>
  flow(
    readFromFile,
    mapLinesToArray,
    toVertexes,
    expandToLines,
    pourStandStackSafe(floorDistance),
    logResult
  );

const firstPartSolution = solution();
firstPartSolution(`${__dirname}/input/input.txt`);

const secondPartSolution = solution(2);
secondPartSolution(`${__dirname}/input/input.txt`);
