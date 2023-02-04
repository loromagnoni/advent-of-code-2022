import { flow } from "fp-ts/lib/function";
import {
  isNotEmpty,
  logResult,
  mapLinesToArray,
  readFromFile,
} from "../shared/utils";

type Node = {
  tag: string;
  neighbours: number[];
  flow: number;
};

type Graph = Record<number, Node>;

const addNode = (
  s: string,
  stringBitmaskMap: Record<string, number>
): Graph => {
  const flow = s.match(/(\d+)/g)![0];
  const [position, ...neighbours] = s.match(/([A-Z]){2}/g)!;
  return {
    [stringBitmaskMap[position]]: {
      neighbours: neighbours.map((s) => stringBitmaskMap[s]),
      flow: Number(flow),
      tag: position,
    },
  };
};

const cache = {} as Record<
  number,
  Record<number, Record<string, Record<number, ScoreSearch>>>
>;

type CachePosition = {
  position: number;
  activeNodes: bigint;
  time: number;
  agents: number;
};

const getFromCache = ({
  position,
  activeNodes,
  time,
  agents,
}: CachePosition): ScoreSearch =>
  cache[agents]?.[position]?.[activeNodes.toString()]?.[time];

const saveInCache = (point: CachePosition, result: ScoreSearch) => {
  const { agents, activeNodes, position, time } = point;
  if (!cache[agents]) {
    cache[agents] = {
      [position]: { [activeNodes.toString()]: { [time]: result } },
    };
    return;
  }
  if (!cache[agents][position]) {
    cache[agents][position] = { [activeNodes.toString()]: { [time]: result } };
    return;
  }
  if (!cache[agents][position][activeNodes.toString()]) {
    cache[agents][position][activeNodes.toString()] = { [time]: result };
    return;
  }
  cache[agents][position][activeNodes.toString()][time] = result;
};

type ActivateNode = {
  activate: string;
  cumulativeScore: number;
  time: number;
  agent: number;
};
type Move = { from: string; to: string; time: number; agent: number };
type Transition = ActivateNode | Move;
type ScoreSearch = {
  score: number;
  transitions: Transition[];
  activeNodes: bigint;
};

const getScoresAfterMove = ({
  graph,
  activeNodes,
  time,
  agents,
  position,
  initialTime,
}: MaxScoreConfig): ScoreSearch[] =>
  graph[position].neighbours.map((n) =>
    maxScore({
      graph,
      activeNodes,
      time: time - 1,
      position: n,
      score: 0,
      transitions: [
        { from: graph[position].tag, to: graph[n].tag, time, agent: agents },
      ],
      agents,
      initialTime,
    })
  );

const getScoreAfterActivation = ({
  graph,
  activeNodes,
  position,
  time,
  agents,
  initialTime,
}: MaxScoreConfig): ScoreSearch | undefined =>
  (activeNodes & BigInt(2 ** position)) > 0 || graph[position].flow === 0
    ? undefined
    : maxScore({
        graph,
        activeNodes: activeNodes | BigInt(2 ** position),
        time: time - 1,
        position,
        score: (time - 1) * graph[position].flow,
        transitions: [
          {
            activate: graph[position].tag,
            cumulativeScore: (time - 1) * graph[position].flow,
            time,
            agent: agents,
          },
        ],
        agents,
        initialTime,
      });

const getMaxResult = (results: (ScoreSearch | undefined)[]): ScoreSearch =>
  results
    .filter(isNotEmpty)
    .reduce(
      (max, result) => (max.score > result.score ? max : result),
      results[0]!
    )!;

type MaxScoreConfig = {
  graph: Graph;
  activeNodes: bigint;
  time: number;
  position: number;
  score: number;
  transitions: Transition[];
  agents: number;
  initialTime: number;
};

const getConfigForNewAgent = (config: MaxScoreConfig): MaxScoreConfig => ({
  graph: config.graph,
  activeNodes: config.activeNodes,
  time: config.initialTime,
  position: findAAPosition(config.graph),
  score: 0,
  transitions: [],
  agents: config.agents - 1,
  initialTime: config.initialTime,
});

const mergeScores = (first: ScoreSearch, second: ScoreSearch): ScoreSearch => ({
  score: first.score + second.score,
  transitions: [...first.transitions, ...second.transitions],
  activeNodes: first.activeNodes | second.activeNodes,
});

const getScoreFromConfig = (config: MaxScoreConfig): ScoreSearch => ({
  score: config.score,
  transitions: config.transitions,
  activeNodes: config.activeNodes,
});

const getCachePositionFromConfig = (config: MaxScoreConfig): CachePosition => ({
  position: config.position,
  activeNodes: config.activeNodes,
  time: config.time,
  agents: config.agents,
});

const maxScore = (opt: MaxScoreConfig): ScoreSearch => {
  if (opt.time <= 0) {
    if (opt.agents === 1)
      return {
        score: opt.score,
        transitions: opt.transitions,
        activeNodes: opt.activeNodes,
      };
    const resultFromAgents = maxScore(getConfigForNewAgent(opt));
    return mergeScores(resultFromAgents, getScoreFromConfig(opt));
  }
  const memoized = getFromCache(getCachePositionFromConfig(opt));
  if (memoized) return mergeScores(memoized, getScoreFromConfig(opt));
  const maxResult = getMaxResult([
    ...getScoresAfterMove(opt),
    getScoreAfterActivation(opt),
  ]);
  saveInCache(getCachePositionFromConfig(opt), maxResult);
  return mergeScores(maxResult, getScoreFromConfig(opt));
};

const getStringPositionBitmaskMap = (input: string[]): Record<string, number> =>
  input
    .map((line) => line.match(/([A-Z]){2}/)![0])
    .reduce(
      (acc, string, index) => ({ ...acc, [string]: index }),
      {} as Record<string, number>
    );

const toGraph = (input: string[]): Graph => {
  const stringBitmaskMap = getStringPositionBitmaskMap(input);
  return input.reduce(
    (g, line) => ({ ...g, ...addNode(line, stringBitmaskMap) }),
    {} as Graph
  );
};

const orderByTime = (res: ScoreSearch): ScoreSearch => ({
  score: res.score,
  transitions: res.transitions.sort((t1, t2) => t2.time - t1.time),
  activeNodes: res.activeNodes,
});

const findAAPosition = (graph: Graph) =>
  Number(
    Object.entries(graph).find(([key, value]) => value.tag === "AA")?.[0]!
  );

const getScoreSearch =
  (agents: number, time: number) =>
  (graph: Graph): ScoreSearch =>
    maxScore({
      graph,
      activeNodes: BigInt(0),
      time: time,
      position: findAAPosition(graph),
      score: 0,
      transitions: [],
      agents,
      initialTime: time,
    });

type SolutionConfig = {
  agents: number;
  time: number;
};

const solution = ({ agents, time }: SolutionConfig) =>
  flow(
    readFromFile,
    mapLinesToArray,
    toGraph,
    getScoreSearch(agents, time),
    orderByTime,
    logResult
  );

const firstPartSolution = solution({ agents: 1, time: 30 });
const secondPartSolution = solution({ agents: 2, time: 26 });

firstPartSolution(`${__dirname}/input/input.txt`);
secondPartSolution(`${__dirname}/input/input.txt`);
