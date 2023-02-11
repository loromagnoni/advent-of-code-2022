import { flow, pipe } from "fp-ts/lib/function";
import {
  deepCopy,
  logResult,
  logTimeCost,
  mapLinesToArray,
  readFromFile,
} from "../shared/utils";

type DeepReadonly<T> = T extends Function
  ? T
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

type SpaceMutable = Record<string, boolean>;

type Space = DeepReadonly<SpaceMutable>;

type Point = [number, number, number];

const toPoints = (lines: string[]) =>
  lines.map((l) => l.split(",").map(Number) as Point);

type SpaceState = {
  space: Space;
  exposedFaces: number;
};

const initState = (): SpaceState => ({
  space: {},
  exposedFaces: 0,
});

const getSpaceKey = (p: Point): string => p.join(";");
const getPointFromKey = (s: string) => s.split(";").map(Number) as Point;

const merge = (cubes: Space, p: Point): Space => {
  const copy = deepCopy(cubes) as SpaceMutable;
  copy[getSpaceKey(p)] = true;
  return Object.freeze(copy);
};

const adjacentPositionDeltas = [
  [0, 0, 1],
  [0, 0, -1],
  [0, 1, 0],
  [0, -1, 0],
  [1, 0, 0],
  [-1, 0, 0],
];

const adjacentCubes = (space: Space, [x, y, z]: Point): number =>
  adjacentPositionDeltas
    .map(
      ([dx, dy, dz]) =>
        (space[getSpaceKey([dx + x, dy + y, dz + z])] ? 1 : 0) as number
    )
    .reduce((a, b) => a + b);

const addCube = (state: SpaceState, position: Point): SpaceState => {
  return {
    space: merge(state.space, position),
    exposedFaces:
      state.exposedFaces + 6 - 2 * adjacentCubes(state.space, position),
  };
};

const getFilledSpace = ([x, y, z]: Point): Space => {
  const space = {} as SpaceMutable;
  for (let i = 0; i < x; i++)
    for (let j = 0; j < y; j++)
      for (let k = 0; k < z; k++) space[getSpaceKey([i, j, k])] = true;
  return space;
};

const getPoints = (space: Space): Point[] =>
  Object.keys(space).map(getPointFromKey);

const getSpace = (points: Point[]): Space => points.reduce(merge, {} as Space);

const getSpaceWrapper = (space: Space): Space =>
  pipe(
    getPoints(space),
    (points) =>
      points.reduce(
        ([mx, my, mz], [px, py, pz]) => [
          Math.max(mx, px),
          Math.max(my, py),
          Math.max(mz, pz),
        ],
        [0, 0, 0]
      ),
    ([x, y, z]) => [x + 2, y + 2, z + 2] as Point,
    getFilledSpace
  );

const removeSolid = (wrapper: SpaceMutable, solid: Space) => {
  Object.keys(solid).forEach((k) => delete wrapper[k]);
  return wrapper;
};

const mergePoints = (clusters: Point[][]): Point[] =>
  clusters.reduce((acc, c) => [...acc, ...c], [] as Point[]);

const isAdjacent = (point: Point) => (cluster: Space) =>
  adjacentCubes(cluster, point) > 0;

const filterWithDiscarded = <T>(
  arr: T[],
  condition: Function
): { matched: T[]; discarded: T[] } =>
  arr.reduce(
    (res, item) => {
      if (condition(item)) {
        res.matched.push(item);
      } else {
        res.discarded.push(item);
      }
      return res;
    },
    { matched: [] as T[], discarded: [] as T[] }
  );

const removeWrapperCluster = (clusters: Space[]): Space[] =>
  clusters.filter((c) => !c[getSpaceKey([0, 0, 0])]);

const divideInClusters = (space: Space): Space[] =>
  getPoints(space).reduce(
    (clusters, point) =>
      pipe(
        filterWithDiscarded(clusters, isAdjacent(point)),
        ({ matched, discarded }) =>
          matched.length > 0
            ? [
                ...discarded,
                {
                  ...matched.reduce(
                    (acc: Space, cluster: Space) => ({ ...acc, ...cluster }),
                    {} as Space
                  ),
                  ...{ [getSpaceKey(point)]: true },
                },
              ]
            : [...clusters, merge({}, point)]
      ),
    [] as Space[]
  );

const findBubbleCubes = (space: Space): Point[] =>
  pipe(
    getSpaceWrapper(space),
    (wrapper) => removeSolid(wrapper, space),
    divideInClusters,
    removeWrapperCluster,
    (bubbles) => mergePoints(bubbles.map(getPoints))
  );

const fillBubbles =
  (isActive: boolean) =>
  (state: SpaceState): SpaceState =>
    isActive ? findBubbleCubes(state.space).reduce(addCube, state) : state;

const fillSpace = (cubes: Point[]): SpaceState =>
  cubes.reduce(addCube, initState());

const getExposedFaces = (state: SpaceState): number => state.exposedFaces;

const solution = (shouldFillBubbles: boolean) =>
  flow(
    readFromFile,
    mapLinesToArray,
    toPoints,
    fillSpace,
    fillBubbles(shouldFillBubbles),
    getExposedFaces,
    logResult
  );

const firstPartSolution = solution(false);
const secondPartSolution = solution(true);

firstPartSolution(`${__dirname}/input/input.txt`);
secondPartSolution(`${__dirname}/input/input.txt`);
