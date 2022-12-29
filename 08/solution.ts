import { array } from "fp-ts";
import { flow } from "fp-ts/lib/function";
import { logResult, readFromFile, trace } from "../shared/utils";

type Matrix<T> = T[][];

const toNumberMatrix = (input: string): Matrix<number> =>
  input.split("\n").map((line) => line.split("").map(Number));

type Tree = { height: number; id: string };

const toTreeMatrix = (input: Matrix<number>): Matrix<Tree> =>
  input.map((row, rowIndex) =>
    row.map((value, colIndex) => ({
      height: value,
      id: `${rowIndex}-${colIndex}`,
    }))
  );

const getVisibleFromLeft = (line: Tree[]): Tree[] =>
  line.reduce(
    (arr, tree, index) =>
      index === 0 || Math.max(...arr.map((t) => t.height)) < tree.height
        ? [...arr, tree]
        : [...arr],
    [] as Tree[]
  );

const getVisibleFromLineSides = (line: Tree[]): Tree[] => [
  ...getVisibleFromLeft(line),
  ...getVisibleFromLeft(line.reverse()),
];

const getVisibleFromMatrixSides = (matrix: Matrix<Tree>): Tree[] =>
  matrix.reduce(
    (visible, row) => [...visible, ...getVisibleFromLineSides(row)],
    [] as Tree[]
  );

const rotateMatrix = (matrix: Matrix<Tree>): Matrix<Tree> =>
  matrix[0].map((_, index) => matrix.map((row) => row[index]));

const getVisibleTrees = (matrix: Matrix<Tree>): Tree[] => [
  ...getVisibleFromMatrixSides(matrix),
  ...getVisibleFromMatrixSides(rotateMatrix(matrix)),
];

const getLength = (trees: Tree[]): number => trees.length;

const distinctTrees = (trees: Tree[]): Tree[] =>
  Object.values(
    trees.reduce(
      (acc, item) => ({ ...acc, [item.id]: item }),
      {} as Record<string, Tree>
    )
  );

const firstPartSolution = flow(
  readFromFile,
  toNumberMatrix,
  toTreeMatrix,
  getVisibleTrees,
  distinctTrees,
  getLength,
  logResult
);

firstPartSolution(`${__dirname}/input/input.txt`);

const getScenicScore = (
  matrix: Matrix<number>,
  row: number,
  col: number
): number => {
  let leftVisibility = 0;
  let rightVisibility = 0;
  let topVisibility = 0;
  let bottomVisibility = 0;
  for (let i = col - 1; i >= 0; i--) {
    leftVisibility++;
    if (matrix[row][i] >= matrix[row][col]) break;
  }
  for (let i = col + 1; i < matrix.length; i++) {
    rightVisibility++;
    if (matrix[row][i] >= matrix[row][col]) break;
  }
  for (let i = row - 1; i >= 0; i--) {
    topVisibility++;
    if (matrix[i][col] >= matrix[row][col]) break;
  }
  for (let i = row + 1; i < matrix[0].length; i++) {
    bottomVisibility++;
    if (matrix[i][col] >= matrix[row][col]) break;
  }
  return leftVisibility * rightVisibility * topVisibility * bottomVisibility;
};

const getScenicScores = (matrix: Matrix<number>): number[] =>
  matrix.reduce(
    (arr, row, rowIndex) => [
      ...arr,
      ...row.map((_, colIndex) => getScenicScore(matrix, rowIndex, colIndex)),
    ],
    [] as Array<number>
  );

const getMaxFromArray = (arr: number[]): number => Math.max(...arr);

const secondPartSolution = flow(
  readFromFile,
  toNumberMatrix,
  getScenicScores,
  getMaxFromArray,
  logResult
);

secondPartSolution(`${__dirname}/input/input.txt`);
