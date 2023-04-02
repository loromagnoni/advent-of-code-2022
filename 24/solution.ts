import { flow, pipe } from "fp-ts/lib/function";
import { logResult, mapLinesToArray, readFromFile } from "../shared/utils";

// input is like this
// #.######
// #>>.<^<#
// #.<..<<#
// #>v.><>#
// #<^v^^>#
// ######.#

type Direction = "up" | "down" | "left" | "right";

type Point = { x: number; y: number };
type BlizzardMap = Map<string, Direction[]>;

type Field = {
  start: Point;
  destination: Point;
  maxDimension: Point;
  blizzards: BlizzardMap;
};

const getField = (input: string[]): Field => {
  const blizzardMap = new Map<string, Direction[]>();
  const directionCharMap = {
    "^": "up",
    v: "down",
    "<": "left",
    ">": "right",
  } as const;
  input.forEach((line, y) => {
    line.split("").forEach((char, x) => {
      if (Object.keys(directionCharMap).includes(char)) {
        blizzardMap.set(`${x}-${y}`, [
          directionCharMap[char as keyof typeof directionCharMap],
        ]);
      }
    });
  });
  const maxDimension = { x: input[0].length - 1, y: input.length - 1 };
  return {
    blizzards: blizzardMap,
    start: { x: 1, y: 0 },
    destination: { x: maxDimension.x - 1, y: maxDimension.y },
    maxDimension,
  };
};

type State = {
  step: number;
  possiblePositions: Point[];
  field: Field;
};

const getPoint = (position: string): Point => {
  const [x, y] = position.split("-").map(Number);
  return { x, y };
};

const getPointKey = ({ x, y }: Point): string => `${x}-${y}`;

const getNextBlizzardPosition = (
  { x, y }: Point,
  direction: Direction[],
  field: Field
): [Point, Direction][] => {
  const directionMap = {
    up: { x, y: y - 1 },
    down: { x, y: y + 1 },
    left: { x: x - 1, y },
    right: { x: x + 1, y },
  } as const;
  return direction.map((d) => {
    const { x: newX, y: newY } = directionMap[d];
    if (newX === 0) return [{ x: field.maxDimension.x - 1, y: newY }, d];
    if (newY === 0) return [{ x: newX, y: field.maxDimension.y - 1 }, d];
    if (newX === field.maxDimension.x) return [{ x: 1, y: newY }, d];
    if (newY === field.maxDimension.y) return [{ x: newX, y: 1 }, d];
    return [{ x: newX, y: newY }, d];
  });
};
// evaluate overlapping blizzards
const moveBlizzards = (map: BlizzardMap, field: Field): BlizzardMap => {
  const newBlizzards = new Map<string, Direction[]>();
  map.forEach((directions, position) => {
    const newPositions = getNextBlizzardPosition(
      getPoint(position),
      directions,
      field
    );
    newPositions.forEach(([p, d]) =>
      newBlizzards.set(
        getPointKey(p),
        (newBlizzards.get(getPointKey(p)) ?? []).concat(d)
      )
    );
  });
  return newBlizzards;
};

const isEqual = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;

const getNextPosition =
  (field: Field) =>
  ({ x: iX, y: iY }: Point): Point[] =>
    [
      { x: iX - 1, y: iY },
      { x: iX + 1, y: iY },
      { x: iX, y: iY - 1 },
      { x: iX, y: iY + 1 },
    ].filter(
      ({ x, y }) =>
        isEqual({ x, y }, field.destination) ||
        isEqual({ x, y }, field.start) ||
        (x > 0 && y > 0 && x < field.maxDimension.x && y < field.maxDimension.y)
    );

const removeDied = (positions: Point[], blizzards: BlizzardMap): Point[] =>
  positions.filter((position) => !blizzards.has(getPointKey(position)));

const removeDuplicates = (positions: Point[]): Point[] => {
  const unique = new Set<string>();
  return positions.filter((position) => {
    const key = getPointKey(position);
    if (unique.has(key)) return false;
    unique.add(key);
    return true;
  });
};

const findExit = (state: State): State => {
  const nextBlizzards = moveBlizzards(state.field.blizzards, state.field);
  const nextPositions = pipe(
    state.possiblePositions
      .flatMap(getNextPosition(state.field))
      .concat(state.possiblePositions),
    removeDuplicates
  );
  const alive = removeDied(nextPositions, nextBlizzards);
  if (alive.some((p) => isEqual(p, state.field.destination))) return state;
  return findExit({
    step: state.step + 1,
    possiblePositions: alive,
    field: { ...state.field, blizzards: nextBlizzards },
  });
};

const initialState = (field: Field): State => ({
  step: 1,
  possiblePositions: [field.start],
  field,
});

const getSteps = (state: State): number => state.step;

const solution = (strategy: typeof findExit) =>
  flow(
    readFromFile,
    mapLinesToArray,
    getField,
    initialState,
    strategy,
    getSteps,
    logResult
  );

const firstPartSolution = solution(findExit);

firstPartSolution(`${__dirname}/input/input.txt`);

const reverseDestination = (state: State): State => ({
  ...state,
  possiblePositions: [state.field.destination],
  field: {
    ...state.field,
    destination: state.field.start,
    start: state.field.destination,
  },
});

const secondPartSolution = solution(
  flow(findExit, reverseDestination, findExit, reverseDestination, findExit)
);

secondPartSolution(`${__dirname}/input/input.txt`);
