import { flow, pipe } from "fp-ts/lib/function";
import {
  logResult,
  mapLinesToArray,
  readFromFile,
  trace,
} from "../shared/utils";

enum Direction {
  LEFT = "L",
  RIGHT = "R",
  UP = "U",
  DOWN = "D",
}

type Move = {
  direction: Direction;
  distance: number;
};

const toMoves = (lines: string[]): Move[] =>
  lines.map((line) => ({
    direction: line.split(" ")[0] as Direction,
    distance: parseInt(line.split(" ")[1]),
  }));

type Position = {
  x: number;
  y: number;
};

type Board = {
  knots: Position[];
};

const copy = <T extends object>(obj: T) => JSON.parse(JSON.stringify(obj));

const toTailPositions = (boards: Board[]): Position[] =>
  Object.values(
    boards.reduce(
      (map, board) => ({
        ...map,
        [`x:${board.knots.slice(-1)[0].x};y:${board.knots.slice(-1)[0].y}`]:
          board.knots.slice(-1)[0],
      }),
      {}
    )
  );

const shiftPosition = (position: Position, moves: Move[]): Position =>
  moves.reduce(
    (pos, move) => ({
      x:
        move.direction === Direction.LEFT
          ? pos.x - move.distance
          : move.direction === Direction.RIGHT
          ? pos.x + move.distance
          : pos.x,
      y:
        move.direction === Direction.DOWN
          ? pos.y - move.distance
          : move.direction === Direction.UP
          ? pos.y + move.distance
          : pos.y,
    }),
    position
  );
const moveHead =
  (move: Move) =>
  (board: Board): Board => ({
    knots: [shiftPosition(board.knots[0], [move]), ...board.knots.slice(1)],
  });

const isTooFar = (a: Position, b: Position): boolean =>
  Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1;

const sharesCoordinate = (a: Position, b: Position): boolean =>
  a.x === b.x || a.y === b.y;

const isDiagonal = (a: Position, b: Position): boolean =>
  Math.abs(a.x - b.x) === Math.abs(a.y - b.y);

const alignCoordinates = (head: Position, tail: Position): Position =>
  sharesCoordinate(head, tail) || isDiagonal(head, tail)
    ? { ...tail }
    : Math.abs(tail.x - head.x) > 1
    ? { x: tail.x, y: head.y }
    : { x: head.x, y: tail.y };

const attach = (head: Position, tail: Position): Position => ({
  x: head.x + (tail.x - head.x) / (Math.abs(tail.x - head.x) || 1),
  y: head.y + (tail.y - head.y) / (Math.abs(tail.y - head.y) || 1),
});

const updateTail = (board: Board): Board => ({
  knots: board.knots
    .slice(1)
    .reduce(
      (acc, k, i) => [
        ...acc,
        isTooFar(acc[i], k) ? attach(acc[i], alignCoordinates(acc[i], k)) : k,
      ],
      [board.knots[0]]
    ),
});

const getNextBoard = (board: Board, move: Move): Board =>
  pipe(board, moveHead(move), updateTail);

const toBoards =
  (knotsLen: number) =>
  (moves: Move[]): Board[] =>
    moves.reduce(
      (boards, move) => [...boards, getNextBoard(boards.slice(-1)[0], move)],
      [
        {
          knots: Array.from({ length: knotsLen }, () => ({ x: 0, y: 0 })),
        },
      ]
    );

const getLength = <T>(arr: T[]) => arr.length;

const toSingleMoves = (moves: Move[]): Move[] =>
  moves.reduce(
    (acc, move) => [
      ...acc,
      ...Array.from({ length: move.distance }, () => ({
        direction: move.direction,
        distance: 1,
      })),
    ],
    [] as Move[]
  );

const logBoards = (boards: Board[]) => {
  const knots = boards.flatMap((b) => b.knots);
  const maxX = Math.max(...knots.map((k) => k.x));
  const maxY = Math.max(...knots.map((k) => k.y));
  const minX = Math.min(...knots.map((k) => k.x));
  const minY = Math.min(...knots.map((k) => k.y));
  boards.forEach((b) => {
    console.log("-----------------------");

    for (let i = maxY; i >= minY; i--) {
      let line = "";
      for (let j = minX; j <= maxX; j++) {
        const index = b.knots.findIndex((k) => k.x === j && k.y === i);
        line += index !== -1 ? index : ".";
      }
      console.log(line);
    }
  });
  return boards;
};

const solution = (knotsLen: number) =>
  flow(
    readFromFile,
    mapLinesToArray,
    toMoves,
    toSingleMoves,
    toBoards(knotsLen),
    toTailPositions,
    getLength,
    logResult
  );

const firstPartSolution = solution(2);

firstPartSolution(`${__dirname}/input/input.txt`);

const secondPartSolution = solution(10);
secondPartSolution(`${__dirname}/input/input.txt`);
