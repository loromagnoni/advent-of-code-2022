//each round has two phases, movement definitions and application of the moves
//if no elf is present around, the elf is still
//if no elf is NW, N, NE the elf moves N
//if no elf is SW, W, SE the elf moves S
//if no elf is NW, W, SW the elf moves W
//if no elf is NE, E, SE the elf moves E
//when the apply the move, in case of conflict no elf moves
//at the end of the round, the first direction to check is moved to the bottom
//after 10 rounds, get the minimum rectangle that contains all the elfes
//count the white spaces in the rectangle

// example of input
// ....#..
// ..###.#
// #...#.#
// .#...##
// #.###..
// ##.#.##
// .#..#..

//get elf list
//compute next positions ==> {previous, next}
//revert conflicts ==> need to keep previous position. I take all conflicts and next = previous
//apply moves => map taking next

import { flow, pipe } from "fp-ts/lib/function";
import { logResult, mapLinesToArray, readFromFile } from "../shared/utils";

type Elf = {
  x: number;
  y: number;
};

type MovingElf = {
  previous: Elf;
  next: Elf;
};

const toElfes = (input: string[]): Elf[] => {
  const elfes: Elf[] = [];
  input.forEach((line, y) => {
    line.split("").forEach((char, x) => {
      if (char === "#") {
        elfes.push({ x, y });
      }
    });
  });
  return elfes;
};

type ElfMap = {
  [key: string]: Elf;
};

const getElfMap = (elfes: Elf[]): ElfMap => {
  const elfMap: ElfMap = {};
  elfes.forEach((elf) => {
    elfMap[`${elf.x}-${elf.y}`] = elf;
  });
  return elfMap;
};

type MovementArea = {
  direction: "N" | "S" | "W" | "E";
  positions: string[];
};

const getDirections = (elf: Elf, shift: number): MovementArea[] => {
  const { x, y } = elf;
  const N = [`${x}-${y - 1}`, `${x - 1}-${y - 1}`, `${x + 1}-${y - 1}`];
  const S = [`${x}-${y + 1}`, `${x - 1}-${y + 1}`, `${x + 1}-${y + 1}`];
  const W = [`${x - 1}-${y}`, `${x - 1}-${y - 1}`, `${x - 1}-${y + 1}`];
  const E = [`${x + 1}-${y}`, `${x + 1}-${y - 1}`, `${x + 1}-${y + 1}`];
  const canonical: MovementArea[] = [
    { direction: "N", positions: N },
    { direction: "S", positions: S },
    { direction: "W", positions: W },
    { direction: "E", positions: E },
  ];
  const shifted = canonical.slice(shift).concat(canonical.slice(0, shift));
  return shifted;
};

const move = ({ x, y }: Elf, direction: MovementArea["direction"]): Elf => {
  return {
    N: { x, y: y - 1 },
    S: { x, y: y + 1 },
    W: { x: x - 1, y },
    E: { x: x + 1, y },
  }[direction];
};

const ifNullSetPrevious = (elf: MovingElf): MovingElf =>
  elf.next ? elf : { previous: elf.previous, next: elf.previous };

const getRingPositions = ({ x, y }: Elf): string[] => {
  const positions: string[] = [];
  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (i !== x || j !== y) {
        positions.push(`${i}-${j}`);
      }
    }
  }
  return positions;
};

const ifAloneSetPrevious =
  (elfes: ElfMap) =>
  (elf: MovingElf): MovingElf =>
    getRingPositions(elf.previous).some((p) => elfes[p])
      ? elf
      : {
          previous: elf.previous,
          next: elf.previous,
        };

const toMovingElf =
  (elfes: ElfMap, shift: number) =>
  (elf: Elf): MovingElf => {
    const directions = getDirections(elf, shift % 4);
    return directions.reduce(
      (moving, area) =>
        moving.next
          ? moving
          : area.positions.find((p) => elfes[p])
          ? moving
          : {
              previous: moving.previous,
              next: move(moving.previous, area.direction),
            },
      { next: null as null | Elf, previous: elf }
    ) as MovingElf;
  };

const prepareToMove =
  (elfes: ElfMap, shift: number) =>
  (elf: Elf): MovingElf =>
    pipe(
      elf,
      toMovingElf(elfes, shift),
      ifNullSetPrevious,
      ifAloneSetPrevious(elfes)
    );

const revertConflicts = (elf: MovingElf, total: MovingElf[]): MovingElf => {
  const conflicts = total.filter(
    (e) => e.next.x === elf.next.x && e.next.y === elf.next.y
  );
  return conflicts.length > 1
    ? { previous: elf.previous, next: elf.previous }
    : elf;
};

const getNext = (elf: MovingElf): Elf => elf.next;

const nextRound = (elfes: Elf[], index: number): MovingElf[] =>
  elfes
    .map(prepareToMove(getElfMap(elfes), index))
    .map((elf, _, elfes) => revertConflicts(elf, elfes));

const simulate =
  (limit?: number) =>
  (elfes: Elf[]): [number, Elf[]] => {
    let moved = true;
    let round = 0;
    let result: MovingElf[] = [];
    while (moved && (!limit || round < limit)) {
      result = nextRound(
        result.length > 0 ? result.map(getNext) : elfes,
        round
      );
      round++;
      moved = result.some(
        (e) => e.previous.x !== e.next.x || e.previous.y !== e.next.y
      );
    }
    return [round, result.map(getNext)];
  };

const getRectangle = (elfes: Elf[]): [number, number, number, number] => {
  const x = elfes.map((e) => e.x);
  const y = elfes.map((e) => e.y);
  return [Math.min(...x), Math.max(...x), Math.min(...y), Math.max(...y)];
};

const getArea = ([minX, maxX, minY, maxY]: [number, number, number, number]) =>
  (maxX - minX + 1) * (maxY - minY + 1);

const solution = (
  strategy: (a: ReturnType<ReturnType<typeof simulate>>) => unknown,
  limit?: number
) =>
  flow(
    readFromFile,
    mapLinesToArray,
    toElfes,
    simulate(limit),
    strategy,
    logResult
  );

const firstPartSolution = solution(
  ([, elfes]) => getArea(getRectangle(elfes)) - elfes.length,
  10
);

firstPartSolution(`${__dirname}/input/input.txt`);

const secondPartSolution = solution(([round]) => round);

secondPartSolution(`${__dirname}/input/input.txt`);
