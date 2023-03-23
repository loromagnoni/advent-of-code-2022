import * as A from "fp-ts/lib/Array";
import { flow } from "fp-ts/lib/function";
import { logResult, mapLinesToArray, readFromFile } from "../shared/utils";
const nerdamer = require("nerdamer");
require("nerdamer/Solve");

type LeafNode = {
  key: string;
  value: number;
};

type Operation = "+" | "-" | "*" | "/" | "=";

type BranchNode = {
  key: string;
  left: string;
  right: string;
  operation: Operation;
};

type Node = BranchNode | LeafNode;

const toNode = (line: string): Node => {
  const branch = line.match(
    /^([a-z]{4}):\s([a-z]{4})\s([\+\-\*\/])\s([a-z]{4})$/
  );
  if (branch) {
    const [key, left, op, right] = branch.slice(1);
    return {
      key,
      left,
      right,
      operation: op as Operation,
    };
  }
  const leaf = line.match(/^([a-z]{4}):\s(\d*)$/);
  const [key, value] = leaf!.slice(1);
  return { key, value: Number(value) };
};

const createCache = (nodes: Node[]): Map<string, Node> => {
  const cache = new Map<string, Node>();
  nodes.forEach((n) => cache.set(n.key, n));
  return cache;
};

const isLeaf = (node: Node): node is LeafNode =>
  typeof (node as LeafNode).value !== "undefined";

const applyOperation = (left: number, right: number, operation: Operation) => {
  switch (operation) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return left / right;
    case "=":
      return left === right ? 1 : 0;
  }
};

const getNodeResult = (node: Node, nodes: Map<string, Node>): number => {
  if (isLeaf(node)) return node.value;
  return applyOperation(
    getNodeResult(nodes.get(node.left)!, nodes),
    getNodeResult(nodes.get(node.right)!, nodes),
    node.operation
  );
};

const getRootResult = (nodes: Node[]): number => {
  const cache = createCache(nodes);
  return getNodeResult(cache.get("root")!, cache);
};

const solution = (strategy: (nodes: Node[]) => number) =>
  flow(readFromFile, mapLinesToArray, A.map(toNode), strategy, logResult);

const firstPartSolution = solution(getRootResult);
firstPartSolution(`${__dirname}/input/input.txt`);

const getStringEquation = (node: Node, cache: Map<string, Node>): string => {
  if (node.key === "humn") return "X";
  if (isLeaf(node)) return node.value.toString();
  return `(${getStringEquation(cache.get(node.left)!, cache)} ${
    node.operation
  } ${getStringEquation(cache.get(node.right)!, cache)})`;
};

const getHumanValue = (nodes: Node[]): number => {
  const cache = createCache(nodes);
  const root = cache.get("root")!;
  cache.set("root", {
    ...root,
    operation: "=",
  });
  const eq = getStringEquation(cache.get("root")!, cache);
  return nerdamer.solve(eq, "X").text();
};

const secondPartSolution = solution(getHumanValue);
secondPartSolution(`${__dirname}/input/input.txt`);
