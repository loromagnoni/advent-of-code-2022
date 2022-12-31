import { constFalse, flow } from "fp-ts/lib/function";
import {
  logResult,
  mapLinesToArray,
  readFromFile,
  trace,
} from "../shared/utils";

type AddXCommand = Readonly<{
  type: "addx";
  x: number;
}>;

type NoOpCommand = Readonly<{
  type: "noop";
}>;

type Command = NoOpCommand | AddXCommand;

const toCommands = (lines: string[]): Command[] =>
  lines.map((l) => ({
    type: l.split(" ")[0] as "addx" | "noop",
    x: parseInt(l.split(" ")[1]),
  }));

type Cycle = Readonly<{
  index: number;
  registry: number;
}>;

const computeCycle = (cycle: Cycle, command: Command): Cycle =>
  command.type === "addx"
    ? {
        index: cycle.index + 2,
        registry: cycle.registry + command.x,
      }
    : {
        index: cycle.index + 1,
        registry: cycle.registry,
      };

const executeCommands = (commands: Command[]): Cycle[] =>
  commands.reduce(
    (cycles, command, index) => [
      ...cycles,
      computeCycle(cycles[index], command),
    ],
    [{ index: 1, registry: 1 }]
  );

const getCycle = (indexToFind: number, cycles: Cycle[]): Cycle =>
  cycles.reduce(
    (res, cycle, i) =>
      res
        ? res
        : cycle.index > indexToFind
        ? {
            index: indexToFind,
            registry: cycles[i - 1].registry,
          }
        : undefined,
    undefined as Cycle | undefined
  )!;

const getCycles =
  (...indexes: number[]) =>
  (cycles: Cycle[]): Cycle[] =>
    indexes.reduce((acc, i) => [...acc, getCycle(i, cycles)], [] as Cycle[]);

const toStrenght = (cycles: Cycle[]): number[] =>
  cycles.map((c) => c.registry * c.index);

const getSum = (arr: number[]) => arr.reduce((acc, i) => acc + i, 0);

const solution = (
  strategy: (
    cycles: Readonly<{
      index: number;
      registry: number;
    }>[]
  ) => unknown
) =>
  flow(
    readFromFile,
    mapLinesToArray,
    toCommands,
    executeCommands,
    strategy,
    logResult
  );

const firstPartStrategy = flow(
  getCycles(20, 60, 100, 140, 180, 220),
  toStrenght,
  getSum
);

const firstPartSolution = solution(firstPartStrategy);
firstPartSolution(`${__dirname}/input/input.txt`);

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => i + start);

const expandCycles = (cycles: Cycle[]): Cycle[] =>
  cycles.slice(1).reduce(
    (acc, c) => [
      ...acc,
      ...Array.from(
        { length: c.index - acc.slice(-1)[0].index - 1 },
        (_, i) => ({
          index: acc.slice(-1)[0].index + i + 1,
          registry: acc.slice(-1)[0].registry,
        })
      ),
      c,
    ],
    [cycles[0]] as Cycle[]
  );

const toPixel = (cycles: Cycle[]): string[] =>
  cycles.reduce(
    (acc, c, index) => [
      ...acc,
      range(c.registry - 1, c.registry + 1).includes(index % 40) ? "#" : ".",
    ],
    [] as string[]
  );

const groupBy =
  <T>(dim: number) =>
  (arr: T[]) =>
    arr.reduce(
      (acc, curr, i) =>
        i % dim
          ? [...acc.slice(0, -1), [...acc.slice(-1)[0], curr]]
          : [...acc, [curr]],
      [] as T[][]
    );

const render = (lines: string[][]): string =>
  lines.map((line) => line.join("")).join("\n");

const secondPartStrategy = flow(expandCycles, toPixel, groupBy(40), render);

const secondPartSolution = solution(secondPartStrategy);

secondPartSolution(`${__dirname}/input/input.txt`);
