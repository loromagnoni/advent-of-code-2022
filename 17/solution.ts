import { flow, pipe } from "fp-ts/lib/function";
import { deepCopy, logResult, readFromFile } from "../shared/utils";

enum JetForceDirection {
  LEFT = "<",
  RIGHT = ">",
}

const toJetForces = (input: string): JetForce[] =>
  input.split("").map((d) => ({
    tag: ForceTag.JET_FORCE,
    direction: d as JetForceDirection,
  }));

type LandedRocks = Record<number, Record<number, boolean>>;

type SimulationState = {
  jetForces: JetForce[];
  jetForceIndex: number;
  rockIndex: number;
  tallestPoint: number;
  landedRocks: LandedRocks;
};

const initSimulationState = (jetForces: JetForce[]): SimulationState => ({
  jetForces,
  jetForceIndex: 0,
  rockIndex: 0,
  tallestPoint: 0,
  landedRocks: {
    0: { 0: true },
    1: { 0: true },
    2: { 0: true },
    3: { 0: true },
    4: { 0: true },
    5: { 0: true },
    6: { 0: true },
  },
});

type Point = Readonly<{
  x: number;
  y: number;
}>;

type Rock = Readonly<Point>[];

const rocks: Rock[] = [
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
  ],
  [
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 1 },
    { x: 2, y: 2 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 0, y: 3 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
  ],
];

const getRockType = (index: number): Rock => rocks[index % rocks.length];

const spawnRock = (rock: Rock, tallestPoint: number): Rock =>
  rock.map((p) => ({
    y: p.y + tallestPoint + 4,
    x: p.x + 2,
  }));

const isLanded = (state: SimulationState, rock: Rock): boolean =>
  rock.some(({ x, y }) => state.landedRocks[x]?.[y - 1]);

const limitRows = (
  limit: number,
  tallestPoint: number,
  landed: LandedRocks
): LandedRocks =>
  Object.fromEntries(
    Object.entries(landed).map(([x, ys]) => [
      x,
      Object.fromEntries(
        Object.entries(ys).filter(([y]) => Number(y) > tallestPoint - limit)
      ),
    ])
  );

const addRock = (landedRocks: LandedRocks, rock: Rock): LandedRocks => {
  const copy = deepCopy(landedRocks);
  rock.forEach(({ x, y }) => {
    copy[x] = copy[x] ?? {};
    copy[x][y] = true;
  });
  return copy;
};

const addLandedRock = (
  rock: Rock,
  state: SimulationState
): SimulationState => ({
  ...state,
  rockIndex: state.rockIndex + 1,
  tallestPoint: Math.max(state.tallestPoint, ...rock.map(({ y }) => y)),
  landedRocks: limitRows(
    100,
    Math.max(state.tallestPoint, ...rock.map(({ y }) => y)),
    addRock(state.landedRocks, rock)
  ),
});

enum ForceTag {
  DOWN_FORCE,
  JET_FORCE,
}

type DownForce = {
  tag: ForceTag.DOWN_FORCE;
};

type JetForce = {
  tag: ForceTag.JET_FORCE;
  direction: JetForceDirection;
};

type Force = DownForce | JetForce;

const getDownForce = (): Force => ({ tag: ForceTag.DOWN_FORCE });

const getJetForce = (state: SimulationState): Force =>
  state.jetForces[state.jetForceIndex % state.jetForces.length];

const getNextForce = (
  previous: Force,
  state: SimulationState
): [SimulationState, Force] =>
  previous.tag === ForceTag.DOWN_FORCE
    ? [{ ...state, jetForceIndex: state.jetForceIndex + 1 }, getJetForce(state)]
    : [state, getDownForce()];

const intersectWalls = (rock: Rock): boolean =>
  rock.some(({ x }) => [-1, 7].includes(x));

const intersectLandedRocks = (rock: Rock, landedRocks: LandedRocks): boolean =>
  rock.some(({ x, y }) => landedRocks[x]?.[y]);

const applyJetForce = (rock: Rock, force: JetForce): Rock =>
  rock.map(({ x, y }) => ({
    x: force.direction === JetForceDirection.LEFT ? x - 1 : x + 1,
    y,
  }));

const canMove = (
  rock: Rock,
  force: JetForce,
  landedRocks: LandedRocks
): boolean =>
  pipe(
    applyJetForce(rock, force),
    (newRock) =>
      !intersectWalls(newRock) && !intersectLandedRocks(newRock, landedRocks)
  );

const applyForce = (rock: Rock, force: Force, landedRocks: LandedRocks): Rock =>
  force.tag === ForceTag.DOWN_FORCE
    ? rock.map(({ x, y }) => ({ x, y: y - 1 }))
    : canMove(rock, force, landedRocks)
    ? applyJetForce(rock, force)
    : rock;

const fall =
  (state: SimulationState, force: Force) =>
  (rock: Rock): SimulationState =>
    isLanded(state, rock) && force.tag === ForceTag.DOWN_FORCE
      ? addLandedRock(rock, state)
      : fall(...getNextForce(force, state))(
          applyForce(rock, force, state.landedRocks)
        );

const dropRock = (state: SimulationState): SimulationState =>
  pipe(
    spawnRock(getRockType(state.rockIndex), state.tallestPoint),
    fall(...getNextForce(getDownForce(), state))
  );

type Reducer = (state: SimulationState) => SimulationState;
type CacheState = {
  isFastForwardDone: boolean;
  simulation: SimulationCache;
};
type SimulationCache = Record<
  number,
  Record<number, Record<string, { tallestPoint: number; rockIndex: number }>>
>;

const fromCache = (
  cache: SimulationCache,
  state: SimulationState
): { tallestPoint: number; rockIndex: number } =>
  cache[state.jetForceIndex % state.jetForces.length]?.[
    state.rockIndex % rocks.length
  ]?.[hashLandedRocks(state.landedRocks)];

const cacheHit = (cache: SimulationCache, state: SimulationState): boolean =>
  !!fromCache(cache, state);

const getLowestPoint = (landed: LandedRocks): number =>
  Math.min(...Object.values(landed).flatMap(Object.keys).map(Number));

const normalize = (landed: LandedRocks) => (offset: number) =>
  Object.fromEntries(
    Object.entries(landed).map(([k, v]) => [
      k,
      Object.fromEntries(
        Object.entries(v).map(([k, v]) => [Number(k) - offset, v])
      ),
    ])
  );

const hashLandedRocks = (landed: LandedRocks): string =>
  pipe(getLowestPoint(landed), normalize(landed), JSON.stringify);

const saveInCache = (
  cache: SimulationCache,
  state: SimulationState
): SimulationState => {
  if (!cache[state.jetForceIndex % state.jetForces.length]) {
    cache[state.jetForceIndex % state.jetForces.length] = {};
  }
  if (
    !cache[state.jetForceIndex % state.jetForces.length][
      state.rockIndex % rocks.length
    ]
  ) {
    cache[state.jetForceIndex % state.jetForces.length][
      state.rockIndex % rocks.length
    ] = {};
  }
  cache[state.jetForceIndex % state.jetForces.length][
    state.rockIndex % rocks.length
  ][hashLandedRocks(state.landedRocks)] = {
    tallestPoint: state.tallestPoint,
    rockIndex: state.rockIndex,
  };
  return state;
};

const patternOccurrences = (
  cachedRockIndex: number,
  currentIndex: number,
  maxIndex: number
) =>
  Math.floor((maxIndex - cachedRockIndex) / (currentIndex - cachedRockIndex));

const fastForward = (
  cached: { tallestPoint: number; rockIndex: number },
  current: SimulationState,
  maxIndex: number
): SimulationState =>
  pipe(current.tallestPoint - cached.tallestPoint, (heightDiff) => ({
    ...current,
    tallestPoint:
      cached.tallestPoint +
      heightDiff *
        patternOccurrences(cached.rockIndex, current.rockIndex, maxIndex),
    rockIndex:
      cached.rockIndex +
      patternOccurrences(cached.rockIndex, current.rockIndex, maxIndex) *
        (current.rockIndex - cached.rockIndex),
    landedRocks: Object.fromEntries(
      Object.entries(current.landedRocks).map(([k, v]) => [
        k,
        Object.fromEntries(
          Object.entries(v).map(([k, v]) => [
            Number(k) +
              heightDiff *
                (patternOccurrences(
                  cached.rockIndex,
                  current.rockIndex,
                  maxIndex
                ) -
                  1),
            v,
          ])
        ),
      ])
    ),
  }));

const fastForwardOnPattern = (reducer: Reducer) => {
  return (maxIndex: number, cacheState: CacheState): Reducer => {
    return (state) => {
      if (cacheState.isFastForwardDone) return reducer(state);
      if (cacheHit(cacheState.simulation, state)) {
        cacheState.isFastForwardDone = true;
        return reducer(
          fastForward(fromCache(cacheState.simulation, state), state, maxIndex)
        );
      }
      return reducer(saveInCache(cacheState.simulation, state));
    };
  };
};

const dropRockWithFastForward = fastForwardOnPattern(dropRock);

const simulateRockRain =
  (rocks: number, cacheState: CacheState) => (jetForces: JetForce[]) => {
    let res = initSimulationState(jetForces);
    while (res.rockIndex < rocks)
      res = dropRockWithFastForward(rocks, cacheState)(res);
    return res;
  };

const getTallestPoint = (state: SimulationState): number => state.tallestPoint;

const initCacheState = (): CacheState => ({
  simulation: {},
  isFastForwardDone: false,
});

const solution = (rocksNumber: number) =>
  flow(
    readFromFile,
    toJetForces,
    simulateRockRain(rocksNumber, initCacheState()),
    getTallestPoint,
    logResult
  );

const firstPartSolution = solution(2022);
firstPartSolution(`${__dirname}/input/input.txt`);
const secondPartSolution = solution(1000000000000);
secondPartSolution(`${__dirname}/input/input.txt`);
