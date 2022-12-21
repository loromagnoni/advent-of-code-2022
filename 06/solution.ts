import { flow, pipe } from "fp-ts/lib/function";
import { logResult, mapLinesToArray, readFromFile } from "../shared/utils";
import * as R from "fp-ts/lib/ReadonlyArray";
import * as S from "fp-ts/lib/string";

const findBoundaryToken =
  (matcher: TokenMatcher) =>
  (chars: ReadonlyArray<string>): number =>
    chars.findIndex((_, index) => matcher(chars, index));

const mapBufferToFirstTokenAppearance =
  (matcher: TokenMatcher) =>
  (buffer: string): number =>
    pipe(buffer, S.split(""), findBoundaryToken(matcher));

type TokenMatcher = (
  chars: ReadonlyArray<string>,
  currentIndex: number
) => boolean;

const solution = (matcher: TokenMatcher) =>
  flow(
    readFromFile,
    mapLinesToArray,
    R.map(mapBufferToFirstTokenAppearance(matcher)),
    logResult
  );

const hasNDistinctChars =
  (n: number) => (chars: ReadonlyArray<string>, currentIndex: number) =>
    currentIndex > n - 1 &&
    new Set(chars.slice(currentIndex - n, currentIndex)).size === n;

const endBoundaryToken = hasNDistinctChars(4);
const endMessageToken = hasNDistinctChars(14);

const firstPartSolution = solution(endBoundaryToken);
const secondPartSolution = solution(endMessageToken);

firstPartSolution(`${__dirname}/input/input.txt`);
secondPartSolution(`${__dirname}/input/input.txt`);
