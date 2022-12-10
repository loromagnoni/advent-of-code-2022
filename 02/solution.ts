import * as A from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import { flow, pipe } from "fp-ts/lib/function";
import { logResult, mapLinesToArray, readFromFile } from "../shared/utils";

enum Move {
  Rock,
  Paper,
  Scissors,
}
type Match = { me: Move; opponent: Move };

const checkHasTwoElements = (
  arr: string[]
): E.Either<string, [string, string]> =>
  arr.length !== 2
    ? E.left("Match must have 2 moves")
    : E.right([arr[0], arr[1]]);

type DecryptionStrategy = (
  fa: [string, string]
) => E.Either<string, [Move, Move]>;

const mapElementsToMoves =
  (strategy: DecryptionStrategy) =>
  (arr: string[]): E.Either<string, Move[][]> => {
    return pipe(
      arr,
      A.map((el) => el.split(" ")),
      A.map(checkHasTwoElements),
      A.map(E.chain(strategy)),
      A.sequence(E.Monad)
    );
  };

const mapMovesToMatches = (
  arr: E.Either<string, Move[][]>
): E.Either<string, Match[]> => {
  return pipe(
    arr,
    E.map((m) => m.map((c) => ({ me: c[1], opponent: c[0] })))
  );
};

const mapElementsToMatches =
  (strategy: DecryptionStrategy) =>
  (arr: string[]): E.Either<string, Match[]> => {
    return pipe(arr, mapElementsToMoves(strategy), mapMovesToMatches);
  };

const ShapeScores = {
  [Move.Rock]: 1,
  [Move.Paper]: 2,
  [Move.Scissors]: 3,
} as const;

const MoveThatWillLose = {
  [Move.Rock]: Move.Scissors,
  [Move.Paper]: Move.Rock,
  [Move.Scissors]: Move.Paper,
} as const;

enum Outcomes {
  WIN,
  DRAW,
  LOSE,
}

const OutcomeScores = {
  [Outcomes.WIN]: 6,
  [Outcomes.DRAW]: 3,
  [Outcomes.LOSE]: 0,
};

const isDraw = (match: Match): boolean => match.me === match.opponent;

const isWin = (moves: Match): boolean =>
  MoveThatWillLose[moves.me] === moves.opponent;

const calculateMatchScore = (match: Match): number => {
  return (
    ShapeScores[match.me] +
    (isDraw(match)
      ? OutcomeScores[Outcomes.DRAW]
      : isWin(match)
      ? OutcomeScores[Outcomes.WIN]
      : OutcomeScores[Outcomes.LOSE])
  );
};

const getMatchesScore = (
  matches: E.Either<string, Match[]>
): E.Either<string, number[]> => {
  return pipe(matches, E.map(A.map(calculateMatchScore)));
};

const getScoresSum = (
  scores: E.Either<string, number[]>
): E.Either<string, number> => {
  return pipe(scores, E.map(A.reduce(0, (acc, curr) => acc + curr)));
};

const solution = (decryptionStrategy: DecryptionStrategy) =>
  flow(
    readFromFile,
    mapLinesToArray,
    mapElementsToMatches(decryptionStrategy),
    getMatchesScore,
    getScoresSum,
    E.match(logResult, logResult)
  );

const getMoveFromString = (s: string): E.Either<string, Move> => {
  if (["A", "X"].includes(s)) return E.right(Move.Rock);
  if (["B", "Y"].includes(s)) return E.right(Move.Paper);
  if (["C", "Z"].includes(s)) return E.right(Move.Scissors);
  return E.left("Character not recognized");
};

const firstPartDecryptStrategy: DecryptionStrategy = flow(
  A.map(getMoveFromString),
  A.sequence(E.Monad)
) as DecryptionStrategy;

const solutionFirstPart = solution(firstPartDecryptStrategy);

solutionFirstPart(`${__dirname}/input/input.txt`);

const getOutcomeFromString = (c: string): E.Either<string, Outcomes> => {
  if (c === "X") return E.right(Outcomes.LOSE);
  if (c === "Y") return E.right(Outcomes.DRAW);
  if (c === "Z") return E.right(Outcomes.WIN);
  return E.left("Outcome string not recognized");
};

const MoveThatWillBeat = {
  [Move.Scissors]: Move.Rock,
  [Move.Rock]: Move.Paper,
  [Move.Paper]: Move.Scissors,
} as const;

const getMyMoveToOutcome = (
  opponentMove: Move,
  outcome: Outcomes
): E.Either<string, Move> => {
  switch (outcome) {
    case Outcomes.DRAW:
      return E.right(opponentMove);
    case Outcomes.WIN:
      return E.right(MoveThatWillBeat[opponentMove]);
    case Outcomes.LOSE:
      return E.right(MoveThatWillLose[opponentMove]);
  }
};

const getMovesFromString = (
  chars: [string, string]
): E.Either<string, [Move, Move]> => {
  return pipe(
    E.Do,
    E.bind("opponent", () => getMoveFromString(chars[0])),
    E.bind("outcome", () => getOutcomeFromString(chars[1])),
    E.bind("me", ({ opponent, outcome }) =>
      getMyMoveToOutcome(opponent, outcome)
    ),
    E.map(({ opponent, me }) => [opponent, me])
  );
};

const secondPartDecryptStrategy: DecryptionStrategy = getMovesFromString;

const solutionSecondPart = solution(secondPartDecryptStrategy);

solutionSecondPart(`${__dirname}/input/input.txt`);
