import * as A from "fp-ts/Array";
import { flow, pipe } from "fp-ts/lib/function";
import {
  getProduct,
  getSum,
  logResult,
  mapLinesToArray,
  readFromFile,
} from "../shared/utils";

enum Resource {
  ORE,
  CLAY,
  OBSIDIAN,
  GEODE,
}

type Robot = {
  resource: Resource;
  requirements: {
    resource: Resource;
    cost: number;
  }[];
};

type Blueprint = {
  id: number;
  robots: Robot[];
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
      robots: [
        {
          resource: Resource.ORE,
          requirements: [{ resource: Resource.ORE, cost: oreForOreRobot }],
        },
        {
          resource: Resource.CLAY,
          requirements: [{ resource: Resource.ORE, cost: oreForClayRobot }],
        },
        {
          resource: Resource.OBSIDIAN,
          requirements: [
            { resource: Resource.ORE, cost: oreForObsidianRobot },
            { resource: Resource.CLAY, cost: clayForObsidianRobot },
          ],
        },
        {
          resource: Resource.GEODE,
          requirements: [
            { resource: Resource.ORE, cost: oreForGeodeRobot },
            { resource: Resource.OBSIDIAN, cost: obsidianForGeodeRobot },
          ],
        },
      ],
    })
  );

type Inventory = Record<Resource, number>;

type State = {
  blueprint: Blueprint;
  maxTime: number;
  initialTime: number;
  activeRobots: Resource[];
  inventory: Inventory;
  maxResourceSpend: Inventory;
};

const canBuid =
  (inventory: Inventory, activeRobots: Resource[], missingTime: number) =>
  (robot: Robot): boolean =>
    robot.requirements.every(
      (r) =>
        (activeRobots.filter((a) => a === r.resource).length +
          inventory[r.resource]) *
          missingTime >=
        r.cost
    );

const isNeeded =
  (activeRobots: Resource[], resourceLimits: Inventory) =>
  (robot: Robot): boolean =>
    resourceLimits[robot.resource] >
    activeRobots.filter((r) => r === robot.resource).length;

const getGeodesOpenedInOneMinute = (activeRobots: Resource[]): number =>
  activeRobots.filter((r) => r === Resource.GEODE).length;

const getInventoryAfterOneMinute = (
  initialInventory: Inventory,
  activeRobots: Resource[]
) =>
  activeRobots.reduce(
    (inventory, resource) => ({
      ...inventory,
      [resource]: inventory[resource] + 1,
    }),
    initialInventory
  );

const getInventoryAfterRobotBuild = (
  initialInventory: Inventory,
  robot: Robot
) =>
  robot.requirements.reduce(
    (inventory, requirement) => ({
      ...inventory,
      [requirement.resource]:
        inventory[requirement.resource] - requirement.cost,
    }),
    initialInventory
  );

const getCacheKey = (state: State): string =>
  `${state.blueprint.id}:${state.initialTime}:${state.activeRobots
    .sort()
    .join(".")}:${JSON.stringify(state.inventory)}`;
type Cache = Record<string, [number, string[]]>;

const getMaxResourceSpend = (blueprint: Blueprint): Inventory => {
  const max = blueprint.robots
    .flatMap((r) => r.requirements)
    .reduce(
      (inv, req) => ({
        ...inv,
        [req.resource]: Math.max(req.cost, inv[req.resource]),
      }),
      initInventory()
    );
  max[Resource.GEODE] = Infinity;
  return max;
};

const hasResourcesToBuild = (inventory: Inventory, robot: Robot): boolean =>
  robot.requirements.every((r) => inventory[r.resource] >= r.cost);

const getStateAfterRobotBuild = (state: State, robot: Robot): State =>
  hasResourcesToBuild(state.inventory, robot)
    ? {
        initialTime: state.initialTime + 1,
        maxTime: state.maxTime,
        blueprint: state.blueprint,
        activeRobots: [...state.activeRobots, robot.resource],
        inventory: getInventoryAfterOneMinute(
          getInventoryAfterRobotBuild(state.inventory, robot),
          state.activeRobots
        ),
        maxResourceSpend: state.maxResourceSpend,
      }
    : getStateAfterRobotBuild(
        {
          initialTime: state.initialTime + 1,
          maxTime: state.maxTime,
          blueprint: state.blueprint,
          activeRobots: state.activeRobots,
          inventory: getInventoryAfterOneMinute(
            state.inventory,
            state.activeRobots
          ),
          maxResourceSpend: state.maxResourceSpend,
        },
        robot
      );

const getMissingTime = (state: State): number =>
  state.maxTime - state.initialTime;

const capInventory = (state: State): Inventory =>
  Object.fromEntries(
    Object.entries(state.inventory).map(([resource, count]) => [
      Number(resource),
      Math.min(
        count,
        Number(resource) === Resource.GEODE
          ? count
          : (state.maxTime - state.initialTime) *
              state.maxResourceSpend[Number(resource) as Resource]
      ),
    ])
  ) as Inventory;

const maxGeodesOpened = (
  cache: Cache,
  state: State,
  action: string
): [number, string[]] => {
  if (state.initialTime > state.maxTime) return [0, []];
  if (state.initialTime === state.maxTime)
    return [
      state.inventory[Resource.GEODE],
      [`finish!, GEODES:${state.inventory[Resource.GEODE]}`],
    ];
  state.inventory = capInventory(state);
  const key = getCacheKey(state);
  if (cache[key]) return [cache[key][0], [action, ...cache[key][1]]];
  const openedWithoutNewRobots = [
    getGeodesOpenedInOneMinute(state.activeRobots) * getMissingTime(state),
    [`TIME ${state.initialTime}: stop producing robots.`],
  ] as [number, string[]];
  const openedWithNewRobots = state.blueprint.robots
    .filter(isNeeded(state.activeRobots, state.maxResourceSpend))
    .filter(canBuid(state.inventory, state.activeRobots, getMissingTime(state)))
    .map((robot) =>
      pipe(getStateAfterRobotBuild(state, robot), (newState) =>
        maxGeodesOpened(
          cache,
          newState,
          `TIME ${newState.initialTime}: creating robot ${robot.resource}`
        )
      )
    );

  const maxRes = [openedWithoutNewRobots, ...openedWithNewRobots].reduce(
    (max, res) => (!max ? res : max[0] > res[0] ? max : res),
    undefined as undefined | [number, string[]]
  )!;
  cache[getCacheKey(state)] = maxRes;
  return [maxRes[0], [action, ...maxRes[1]]];
};

const initInventory = (): Inventory => ({
  [Resource.ORE]: 0,
  [Resource.CLAY]: 0,
  [Resource.OBSIDIAN]: 0,
  [Resource.GEODE]: 0,
});

const initCache = (): Cache => ({});

const getFirst = <T>(arr: T[]): T => arr[0];

const toQualityLevel = (blueprint: Blueprint): number =>
  blueprint.id *
  getFirst<any>(
    maxGeodesOpened(
      initCache(),
      {
        maxTime: 24,
        initialTime: 0,
        blueprint,
        activeRobots: [Resource.ORE],
        inventory: initInventory(),
        maxResourceSpend: getMaxResourceSpend(blueprint),
      },
      "start"
    )
  );

const solution = (strategy: (blueprints: Blueprint[]) => number) =>
  flow(readFromFile, mapLinesToArray, A.map(toBlueprint), strategy, logResult);

const firstPartSolution = solution(flow(A.map(toQualityLevel), getSum));

//firstPartSolution(`${__dirname}/input/input.txt`);

const secondPartSolution = solution(
  flow(
    (b) => b.slice(0, 2),
    A.map((blueprint) =>
      getFirst<any>(
        maxGeodesOpened(
          initCache(),
          {
            maxTime: 32,
            initialTime: 0,
            blueprint,
            activeRobots: [Resource.ORE],
            inventory: initInventory(),
            maxResourceSpend: getMaxResourceSpend(blueprint),
          },
          "start"
        )
      )
    ),
    getProduct
  )
);

secondPartSolution(`${__dirname}/input/test.txt`);
