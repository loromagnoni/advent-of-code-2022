import { flow, pipe } from "fp-ts/lib/function";
import {
  logResult,
  mapLinesToArray,
  readFromFile,
  trace,
} from "../shared/utils";

const ROOT = "/" as const;

type Folder = { [key: string]: Folder | number };

type FileSystem = { [ROOT]: Folder | number; pwd: string };

type FolderWithSize = { path: string; size: number };

const isNumber = (value: Folder | number): value is number =>
  typeof value !== "object";

const getTotalSize = (obj: Record<string, number>): number =>
  Math.max(...Object.values(obj));

const getFolderSize = (
  prefix: string,
  folder: Folder
): Record<string, number> =>
  Object.entries(folder).reduce(
    (acc, [key, value]) =>
      isNumber(value)
        ? {
            ...acc,
            [prefix]: (acc[prefix] || 0) + value,
          }
        : {
            ...getFolderSize(`${prefix}${key}/`, value),
            ...acc,
            [prefix]:
              (acc[prefix] || 0) +
              getTotalSize(getFolderSize(`${prefix}${key}/`, value)),
          },
    {} as Record<string, number>
  );

const mapToFolderSizes = (fs: FileSystem): FolderWithSize[] =>
  Object.entries(getFolderSize(ROOT, fs[ROOT] as Folder)).map(
    ([path, size]) => ({
      path,
      size,
    })
  );

const getLessThan100KB = (folderSizes: FolderWithSize[]): FolderWithSize[] =>
  folderSizes.filter((f) => f.size < 100000);

const sumSizes = (folderSizes: FolderWithSize[]): number =>
  folderSizes.reduce((acc, curr) => acc + curr.size, 0);

const CD = "cd" as const;
const LS = "ls" as const;

type ChangeDirectoryCommand = {
  arg: string;
};

type ListDirectoryCommand = {
  output: Folder;
};

type Command = ChangeDirectoryCommand | ListDirectoryCommand;

const updatePWD = (current: string, arg: string): string =>
  arg === ROOT
    ? ROOT
    : arg === ".."
    ? current.split("/").slice(0, -1).join("/")
    : `${current}/${arg}`.replace("//", "/");

const applyCDCommandToFS = (
  fs: FileSystem,
  command: ChangeDirectoryCommand
): FileSystem => ({ ...fs, pwd: updatePWD(fs.pwd, command.arg) });

const updateFolder = (root: Folder | number, path: string, updated: Folder) => {
  if (path === ROOT) return updated;
  const copy = JSON.parse(JSON.stringify(root));
  path
    .split("/")
    .slice(0, -1)
    .reduce((acc, p) => (p === "" ? acc : acc[p]), copy)[
    path.split("/").slice(-1)[0]
  ] = updated;
  return copy;
};

const applyLSCommandToFS = (
  fs: FileSystem,
  command: ListDirectoryCommand
): FileSystem => ({
  ...fs,
  [ROOT]: updateFolder(fs[ROOT], fs.pwd, command.output),
});

const isCDCommand = (command: Command): command is ChangeDirectoryCommand =>
  (command as ChangeDirectoryCommand).arg !== undefined;

const applyCommandToFS = (fs: FileSystem, command: Command): FileSystem =>
  isCDCommand(command)
    ? applyCDCommandToFS(fs, command)
    : applyLSCommandToFS(fs, command);

const executeCommandsOnFS = (lines: Command[]): FileSystem =>
  lines.reduce(applyCommandToFS, { [ROOT]: 0, pwd: ROOT });

const toFolder = (lines: string[]): Folder =>
  lines.reduce(
    (acc, l) =>
      l.split(" ")[0] === "dir"
        ? { ...acc, [l.split(" ")[1]]: 0 }
        : { ...acc, [l.split(" ")[1]]: Number(l.split(" ")[0]) },
    {} as Folder
  );

const toCommand = (lines: string[]): Command =>
  lines[0].split(" ")[1] == CD
    ? { arg: lines[0].split(" ")[2] }
    : { output: toFolder(lines.slice(1)) };

const mapToCommands = (lines: string[][]): Command[] => lines.map(toCommand);

const groupLinesByCommand = (lines: string[]): string[][] =>
  lines.reduce(
    (acc, line) =>
      line.startsWith("$")
        ? [...acc, [line]]
        : [...acc.slice(0, -1), [...acc.slice(-1).flat(), line]],
    [] as string[][]
  );

type FilterStrategy = (folderSizes: FolderWithSize[]) => FolderWithSize[];
const solution = (filterStrategy: FilterStrategy) =>
  flow(
    readFromFile,
    mapLinesToArray,
    groupLinesByCommand,
    mapToCommands,
    executeCommandsOnFS,
    mapToFolderSizes,
    filterStrategy,
    sumSizes,
    logResult
  );

const firstPartSolution = solution(getLessThan100KB);
firstPartSolution(`${__dirname}/input/test.txt`);

const getMinToFreeSpace: FilterStrategy = (folderSizes) => {
  const freeSpace =
    70_000_000 - folderSizes.filter((f) => f.path === ROOT)[0].size;
  return folderSizes
    .filter((f) => freeSpace + f.size >= 30_000_000)
    .reduce(
      (acc, curr) =>
        (acc[0]?.size ?? Infinity) > curr.size ? [curr] : [...acc],
      [] as FolderWithSize[]
    );
};

const secondPartSolution = solution(getMinToFreeSpace);
secondPartSolution(`${__dirname}/input/input.txt`);
