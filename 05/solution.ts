//read from file
//get N number of stacks
//read N stacks
//prendo solo quelle linee
//reduce dalle linee a stackgroup
//read moves
//apply moves
//get top stacks
//print them

import { flow, pipe } from "fp-ts/lib/function";
import * as R from "fp-ts/lib/ReadonlyArray";
import * as S from "fp-ts/lib/string";
import { moveMessagePortToContext } from "worker_threads";
import { logResult, mapLinesToArray, readFromFile } from "../shared/utils";

const isPositive = (n: number): boolean => n > 0;

const isIndexLine = (line: string) =>
  pipe(
    line,
    S.split(" "),
    R.filter(Boolean),
    R.map(Number),
    R.every(isPositive)
  );

type Stack = Readonly<string[]>;
type StackGroup = Readonly<Stack[]>;
type Move = Readonly<{ from: number; to: number; size: number }>;
type Snaphshot = { group: StackGroup; moves: Move[] };

const isFloorLine = (line: string) => line.includes("[");

const toGroup = (line: string): StackGroup =>
  pipe(
    line,
    (line) => line.match(/[(A-Z)]|(\s{4})/g) ?? [],
    R.map((i) => (i === "    " ? [] : [i]))
  );

const toMove = (line: string): Move =>
  pipe(
    line,
    (line) => line.match(/(\d+)/g) ?? [],
    R.map(Number),
    ([size, from, to]) => ({ from, to, size })
  );

const appendToGroup = (base: StackGroup, toAppend: StackGroup): StackGroup =>
  toAppend.map((stack, index) => [...(base[index] || []), ...stack]);

const applyGroupLine = (group: StackGroup, line: string): StackGroup =>
  isFloorLine(line)
    ? pipe(line, toGroup, (toAppend) => appendToGroup(group, toAppend))
    : group;

const isMoveLine = (line: string) => line.includes("from");

const applyMoveLine = (moves: Move[], line: string): Move[] =>
  isMoveLine(line) ? pipe(line, toMove, (move) => [...moves, move]) : moves;

const toStackGroupAndMoves = (lines: string[]): Snaphshot =>
  pipe(
    lines,
    R.reduce({ group: [], moves: [] } as Snaphshot, (res, line) => ({
      group: applyGroupLine(res.group, line),
      moves: applyMoveLine(res.moves, line),
    }))
  );

const applyMove =
  (isReverse: boolean) =>
  (group: StackGroup, move: Move): StackGroup => {
    const newGroup = group.slice().map((i) => i.slice());
    const moved = newGroup[move.from - 1].slice(0, move.size);
    newGroup[move.to - 1] = [
      ...(isReverse ? moved.reverse() : moved),
      ...newGroup[move.to - 1],
    ];
    newGroup[move.from - 1] = newGroup[move.from - 1].slice(move.size);
    return newGroup;
  };

const applyMoves =
  (isReverse: boolean) =>
  (snapshot: Snaphshot): StackGroup =>
    snapshot.moves.reduce(applyMove(isReverse), snapshot.group);

const getInitials = (group: StackGroup): string =>
  group.reduce((s, curr) => s + curr[0] ?? "", "");

const solution = (isReverse: boolean) =>
  flow(
    readFromFile,
    mapLinesToArray,
    toStackGroupAndMoves,
    applyMoves(isReverse),
    getInitials,
    logResult
  );

const firstPartSolution = solution(true);
const secondPartSolution = solution(false);

firstPartSolution(`${__dirname}/input/input.txt`);
secondPartSolution(`${__dirname}/input/input.txt`);
