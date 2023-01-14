import { flow } from "fp-ts/lib/function";
import {
  logResult,
  mapLinesToArray,
  readFromFile,
  unique,
} from "../shared/utils";

type NodeID = `${number}:${number}`;

type Node = {
  height: number;
  char: string;
  neighbours: Array<NodeID>;
};

type Graph = Record<NodeID, Node>;

const toMatrix = (lines: string[]): string[][] =>
  lines.map((line) => line.split(""));

const getNodeID = (
  matrix: string[][],
  row: number,
  col: number
): NodeID | undefined =>
  matrix[row] && matrix[row][col] ? (`${row}:${col}` as NodeID) : undefined;

const removeEmpty = <T>(arr: Array<T | undefined>): T[] =>
  arr.filter((i) => !!i) as T[];

const getNeightBoursPoints = (row: number, col: number): number[][] => [
  [row - 1, col],
  [row + 1, col],
  [row, col - 1],
  [row, col + 1],
];

const getHeight = (char: string): number =>
  char === "S"
    ? "a".charCodeAt(0)
    : char === "E"
    ? "z".charCodeAt(0)
    : char.charCodeAt(0);

const getSingleGraph = (
  matrix: string[][],
  row: number,
  col: number
): Graph => ({
  [getNodeID(matrix, row, col)!]: {
    height: getHeight(matrix[row][col]),
    char: matrix[row][col],
    neighbours: removeEmpty(
      getNeightBoursPoints(row, col).map(([r, c]) => getNodeID(matrix, r, c))
    ),
  },
});

const mapToGraph = (lines: string[]): Graph =>
  toMatrix(lines).reduce(
    (graph, line, row, matrix) => ({
      ...graph,
      ...line.reduce(
        (rowGraph, _, col) => ({
          ...rowGraph,
          ...getSingleGraph(matrix, row, col),
        }),
        {} as Graph
      ),
    }),
    {} as Graph
  );

const removeUnreachablePath = (graph: Graph): Graph =>
  Object.fromEntries(
    Object.entries(graph).map(([key, node]) => [
      key,
      {
        ...node,
        neighbours: node.neighbours.filter(
          (id) => graph[id].height <= node.height + 1
        ),
      },
    ])
  );

type SearchState = {
  pathLength: number;
  end: NodeID;
  visited: Array<NodeID>;
  currentVisiting: Array<NodeID>;
  graph: Graph;
};

type StartingPositionGetter = (graph: Graph) => Array<NodeID>;

const toSearchStates =
  (startingPositionGetter: StartingPositionGetter) =>
  (graph: Graph): Array<SearchState> =>
    startingPositionGetter(graph).map((start) => ({
      pathLength: -1,
      end: Object.keys(graph).find(
        (id) => graph[id as NodeID].char === "E"
      ) as NodeID,
      visited: [],
      currentVisiting: [start],
      graph,
    }));

const getExpandedRing = (
  ring: Array<NodeID>,
  graph: Graph,
  visited: Array<NodeID>
): Array<NodeID> =>
  unique(
    ring
      .flatMap((id) => graph[id].neighbours)
      .filter((id) => !visited.includes(id))
  );

const expandSearch = (state: SearchState): SearchState =>
  state.visited.includes(state.end)
    ? state
    : {
        ...state,
        visited: [...state.visited, ...state.currentVisiting],
        pathLength: state.pathLength + 1,
        currentVisiting: getExpandedRing(
          state.currentVisiting,
          state.graph,
          state.visited
        ),
      };

const getMinimumDistance = (initialStates: Array<SearchState>): number =>
  Math.min(
    ...initialStates.map(
      (state) =>
        Object.keys(state.graph)
          .map((_, index) => index)
          .reduce(expandSearch, state).pathLength
    )
  );

const solution = (startingPositionGetter: StartingPositionGetter) =>
  flow(
    readFromFile,
    mapLinesToArray,
    mapToGraph,
    removeUnreachablePath,
    toSearchStates(startingPositionGetter),
    getMinimumDistance,
    logResult
  );

const startFromS: StartingPositionGetter = (graph) => [
  Object.keys(graph).find((id) => graph[id as NodeID].char === "S") as NodeID,
];

const firstPartSolution = solution(startFromS);

const startFromAs: StartingPositionGetter = (graph) =>
  Object.keys(graph).filter(
    (id) => graph[id as NodeID].char === "S" || graph[id as NodeID].char === "a"
  ) as NodeID[];

firstPartSolution(`${__dirname}/input/input.txt`);
const secondPartSolution = solution(startFromAs);
secondPartSolution(`${__dirname}/input/input.txt`);
