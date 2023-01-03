import { flow } from "fp-ts/lib/function";
import { range } from "fp-ts/lib/ReadonlyNonEmptyArray";
import { logResult, mapLinesToArray, readFromFile } from "../shared/utils";

enum Operator {
  Multiply,
  Addition,
}

type Operation = {
  operator: Operator;
  argument: number | "input";
};

type Monkey = {
  id: number;
  items: number[];
  operation: Operation;
  divisible: number;
  trueMonkey: number;
  falseMonkey: number;
  inspectCount: number;
};

const getLastToken = (line: string): string => line.split(" ").slice(-1)[0];

const getLastNumberInLine = (line: string): number =>
  Number(getLastToken(line));

const toOperation = (line: string): Operation => ({
  operator: line.includes("*") ? Operator.Multiply : Operator.Addition,
  argument: getLastToken(line) === "old" ? "input" : getLastNumberInLine(line),
});

const toMonkey = (groups: string[][]): Monkey[] =>
  groups.map((lines, index) => ({
    id: index,
    items: lines[1].replace(/,/g, "").split(" ").slice(4).map(Number),
    operation: toOperation(lines[2]),
    divisible: getLastNumberInLine(lines[3]),
    trueMonkey: getLastNumberInLine(lines[4]),
    falseMonkey: getLastNumberInLine(lines[5]),
    inspectCount: 0,
  }));

const groupLinesByMonkey = (lines: string[]): string[][] =>
  lines.reduce(
    (acc, line, index) =>
      index % 6
        ? [...acc.slice(0, -1), [...acc.slice(-1)[0], line]]
        : [...acc, [line]],
    [] as string[][]
  );

const valueAfterPlaying = (
  op: Operation,
  value: number,
  worryLevelDivider: number
) =>
  Math.floor(
    (op.operator === Operator.Addition
      ? value + (op.argument === "input" ? value : op.argument)
      : value * (op.argument === "input" ? value : op.argument)) /
      worryLevelDivider
  );

const removeItem = (m: Monkey): Monkey => ({
  ...m,
  items: m.items.slice(1),
  inspectCount: m.inspectCount + 1,
});

const addItem = (m: Monkey, item: number): Monkey => ({
  ...m,
  items: [...m.items, item],
});

const launchItem = (
  from: number,
  to: number,
  monkeys: Monkey[],
  toAdd: number
): Monkey[] =>
  monkeys.map((m) =>
    m.id === from ? removeItem(m) : m.id === to ? addItem(m, toAdd) : m
  );

const branchCondition = (
  monkey: Monkey,
  item: number,
  monkeyInteraction: MonkeyInteractionWorry
) => monkeyInteraction(monkey.operation, item) % monkey.divisible === 0;

const moveMonkey =
  (monkeyInteraction: MonkeyInteractionWorry) =>
  (startingMonkeys: Monkey[], moving: Monkey, index: number): Monkey[] =>
    startingMonkeys[index].items.reduce(
      (monkeys, item) =>
        launchItem(
          moving.id,
          branchCondition(moving, item, monkeyInteraction)
            ? moving.trueMonkey
            : moving.falseMonkey,
          monkeys,
          monkeyInteraction(moving.operation, item)
        ),
      startingMonkeys
    );

const executeRound =
  (monkeyInteraction: MonkeyInteractionWorry) =>
  (monkeys: Monkey[]): Monkey[] =>
    monkeys.reduce(moveMonkey(monkeyInteraction), monkeys);

const executeRounds =
  (num: number, monkeyInteraction: MonkeyInteractionWorryGetter) =>
  (startMonkeys: Monkey[]): Monkey[] =>
    range(1, num).reduce(
      executeRound(monkeyInteraction(startMonkeys)),
      startMonkeys
    );

const getTopInspectors = (monkeys: Monkey[]): Monkey[] =>
  monkeys.sort((a, b) => a.inspectCount - b.inspectCount).slice(-2);

const getMonkeyBusiness = (monkeys: Monkey[]): number =>
  monkeys.reduce((res, m) => res * m.inspectCount, 1);

type WorryLevelDividerGetter = (monkeys: Monkey[]) => number;

const worryLevelDivided = (_: Monkey[]) => (op: Operation, value: number) =>
  Math.floor(
    (op.operator === Operator.Addition
      ? value + (op.argument === "input" ? value : op.argument)
      : value * (op.argument === "input" ? value : op.argument)) / 3
  );

type MonkeyInteractionWorryGetter = typeof worryLevelDivided;
type MonkeyInteractionWorry = ReturnType<MonkeyInteractionWorryGetter>;

const solution = (
  roundNumbers: number,
  monkeyInteractionCalculator: MonkeyInteractionWorryGetter
) =>
  flow(
    readFromFile,
    mapLinesToArray,
    groupLinesByMonkey,
    toMonkey,
    executeRounds(roundNumbers, monkeyInteractionCalculator),
    getTopInspectors,
    getMonkeyBusiness,
    logResult
  );

const firstPartSolution = solution(20, worryLevelDivided);

//firstPartSolution(`${__dirname}/input/input.txt`);

const getTotalModulo = (monkeys: Monkey[]) =>
  monkeys.reduce((res, m) => res * m.divisible, 1);

const totalDividerModulo =
  (monkeys: Monkey[]) => (op: Operation, value: number) =>
    (op.operator === Operator.Addition
      ? value + (op.argument === "input" ? value : op.argument)
      : value * (op.argument === "input" ? value : op.argument)) %
    getTotalModulo(monkeys);

const dividerProduct: WorryLevelDividerGetter = (m) =>
  m.reduce((res, m) => res * m.divisible, 1);

const secondPartSolution = solution(10000, totalDividerModulo);
secondPartSolution(`${__dirname}/input/input.txt`);
