import * as A from "fp-ts/Array";
import { flow, pipe } from "fp-ts/lib/function";
import {
  getProduct,
  getSum,
  logResult,
  mapLinesToArray,
  readFromFile,
} from "../shared/utils";

type RobotRequirements = number[];

type Blueprint = {
  id: number;
  requirements: RobotRequirements[];
};

const toBlueprint = (line: string): Blueprint =>
  pipe(
    line.match(/(\d+)/g)!.map(Number),
    ([
      id,
      oreForOreRobot,
      oreForClayRobot,
      oreForObsidianRobot,
      clayForObsidianRobot,
      oreForGeodeRobot,
      obsidianForGeodeRobot,
    ]) => ({
      id,
      requirements: [
        [oreForOreRobot, 0, 0],
        [oreForClayRobot, 0, 0],
        [oreForObsidianRobot, clayForObsidianRobot, 0],
        [oreForGeodeRobot, 0, obsidianForGeodeRobot],
      ],
    })
  );

type State = {
  time: number;
  robots: number[];
  inventory: number[];
  blueprint: Blueprint;
  maxResourceSpend: RobotRequirements;
};

const canBuild =
  (state: State) =>
  (robot: number): boolean =>
    state.time > 0 &&
    state.blueprint.requirements[robot].every(
      (quantity, resource) =>
        quantity <=
        state.inventory[resource] + state.robots[resource] * (state.time - 1)
    );

const isUseful =
  (state: State) =>
  (robot: number): boolean =>
    robot === 3 || state.robots[robot] < state.maxResourceSpend[robot];

const timeNeededToBuild = (robot: number, state: State): number =>
  Math.max(
    ...state.blueprint.requirements[robot]
      .map((r, i) => Math.max(r - state.inventory[i], 0))
      .map((needed, index) =>
        needed === 0 ? 0 : Math.ceil(needed / state.robots[index])
      )
  ) + 1;

const capInventory = (state: State) => ({
  ...state,
  inventory: state.inventory.map((c, i) =>
    i === 3 ? c : Math.min(c, state.maxResourceSpend[i] * state.time)
  ),
});

const buildRobot = (state: State) => (robot: number) => {
  const timeNeeded = timeNeededToBuild(robot, state);
  if (timeNeeded === 0) throw new Error("Time needed is 0");
  return {
    time: state.time - timeNeeded,
    robots: state.robots.map((r, i) => (i === robot ? r + 1 : r)),
    inventory: state.inventory.map(
      (r, i) =>
        r +
        state.robots[i] * timeNeeded -
        (state.blueprint.requirements[robot][i] || 0)
    ),
    blueprint: state.blueprint,
    maxResourceSpend: state.maxResourceSpend,
  };
};

const getCacheKey = (state: State) =>
  `${state.time}.${state.robots.join(".")}${state.inventory.join(".")}`;
const getFromCache = (state: State, cache: Map<string, number>) =>
  cache.get(getCacheKey(state));
const setToCache = (
  state: State,
  value: number,
  cache: Map<string, number>
) => {
  cache.set(getCacheKey(state), value);
};

const DSF = (state: State, cache: Map<string, number>): number => {
  const cached = getFromCache(state, cache);
  if (cached) return cached;
  const possibleRobots = [0, 1, 2, 3].filter(canBuild(state));
  const usefulRobots = possibleRobots.filter(isUseful(state));
  if (usefulRobots.length === 0)
    return state.inventory[3] + state.robots[3] * state.time;
  const nextPaths = usefulRobots.map(buildRobot(state)).map(capInventory);
  const results = nextPaths.map((s) => DSF(s, cache));
  const res = Math.max(...results);
  setToCache(state, res, cache);
  return res;
};

const getMaxResourceSpend = (blueprint: Blueprint): RobotRequirements =>
  blueprint.requirements.reduce(
    (acc, curr) => acc.map((r, i) => Math.max(r, curr[i])),
    [0, 0, 0]
  );

const initialState = (blueprint: Blueprint, time: number): State => ({
  time,
  robots: [1, 0, 0, 0],
  inventory: [0, 0, 0, 0],
  blueprint,
  maxResourceSpend: getMaxResourceSpend(blueprint),
});

const maxGeodes =
  (time: number) =>
  (blueprint: Blueprint): [number, number] =>
    [
      blueprint.id,
      DSF(initialState(blueprint, time), new Map<string, number>()),
    ];

const toQualityLevel = ([blueprintId, maxGeodes]: [number, number]) =>
  blueprintId * maxGeodes;

const solution = flow(
  readFromFile,
  mapLinesToArray,
  A.map(toBlueprint),
  A.map(maxGeodes(24)),
  A.map(toQualityLevel),
  getSum,
  logResult
);

solution(`${__dirname}/input/input.txt`);

const getSecond = <T>(arr: T[]): T => arr[1];

const solution2 = flow(
  readFromFile,
  mapLinesToArray,
  A.map(toBlueprint),
  (b) => b.slice(0, 3),
  A.map(maxGeodes(32)),
  A.map(getSecond),
  getProduct,
  logResult
);

solution2(`${__dirname}/input/input.txt`);
