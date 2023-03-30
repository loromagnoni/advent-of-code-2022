import { flow, pipe } from "fp-ts/lib/function";
import { getOptionM } from "fp-ts/lib/OptionT";
import {
  logResult,
  mapLinesToArray,
  range,
  readFromFile,
  unique,
} from "../shared/utils";

type Point = {
  up: [string, Direction | null];
  down: [string, Direction | null];
  left: [string, Direction | null];
  right: [string, Direction | null];
  key: string;
};
enum PointType {
  valid = "valid",
  wall = "wall",
}

type ForwardMove = {
  value: number;
};
type RotateMove = {
  direction: "L" | "R";
};
type Move = ForwardMove | RotateMove;

type Field = {
  values: Map<string, Point>;
  moves: Move[];
};

const getMapKey = (x: number, y: number): string => `${x}:${y}`;
const getCoordinates = (key: string): [number, number] =>
  key.split(":").map(Number) as unknown as [number, number];

const getFirst =
  (
    nextPointGetter: (x: number, y: number) => [number, number],
    previousPointGetter: (x: number, y: number) => [number, number],
    direction: Direction
  ) =>
  (key: string, tempField: Map<string, PointType>): [string, Direction] => {
    const nextPointCoordinatesKey = getMapKey(
      ...nextPointGetter(...getCoordinates(key))
    );
    if (tempField.get(nextPointCoordinatesKey) === PointType.valid)
      return [nextPointCoordinatesKey, direction];
    if (tempField.get(nextPointCoordinatesKey) === PointType.wall)
      return [key, direction];
    let nextCoord = getCoordinates(key);
    while (tempField.get(getMapKey(...previousPointGetter(...nextCoord)))) {
      nextCoord = previousPointGetter(...nextCoord);
    }
    const nextPoint = tempField.get(getMapKey(...nextCoord));
    if (nextPoint === PointType.valid)
      return [getMapKey(...nextCoord), direction];
    if (nextPoint === PointType.wall) return [key, direction];
    throw new Error("Cannot find next point");
  };

const getFirstDown = getFirst(
  (x, y) => [x, y + 1],
  (x, y) => [x, y - 1],
  "down"
);

const getFirstUp = getFirst(
  (x, y) => [x, y - 1],
  (x, y) => [x, y + 1],
  "up"
);

const getFirstLeft = getFirst(
  (x, y) => [x - 1, y],
  (x, y) => [x + 1, y],
  "left"
);
const getFirstRight = getFirst(
  (x, y) => [x + 1, y],
  (x, y) => [x - 1, y],
  "right"
);

const getPoint = (key: string, tempField: Map<string, PointType>): Point => {
  return {
    up: getFirstUp(key, tempField),
    left: getFirstLeft(key, tempField),
    right: getFirstRight(key, tempField),
    down: getFirstDown(key, tempField),
    key,
  };
};

const toMoves = (s: string): Move[] =>
  s
    .split(/([LR])/g)
    .map((token) =>
      ["L", "R"].includes(token)
        ? { direction: token as "L" | "R" }
        : { value: Number(token) }
    );

const toField =
  (pointBuilder: typeof getPoint) =>
  (lines: string[]): Field => {
    const tempField = new Map<string, PointType>();
    for (let i = 0; i < lines.length - 1; i++) {
      lines[i].split("").forEach((c, j) => {
        if (c === ".") {
          tempField.set(getMapKey(j, i), PointType.valid);
        }
        if (c === "#") {
          tempField.set(getMapKey(j, i), PointType.wall);
        }
      });
    }
    const values = new Map<string, Point>();
    [...tempField.entries()].forEach(([key, type]) => {
      if (type === PointType.valid)
        values.set(key, pointBuilder(key, tempField));
    });
    const moves = toMoves(lines[lines.length - 1]);
    return { moves, values };
  };

type Direction = keyof Point;

type State = {
  values: Map<string, Point>;
  point: Point;
  direction: Direction;
};

const getTopLeftItem = <T>(points: Map<string, T>): [string, T] =>
  [...points.entries()]
    .filter(([key]) => getCoordinates(key)[1] === 0)
    .sort(([a], [b]) => getCoordinates(a)[0] - getCoordinates(b)[0])[0];

const initialState = (values: Map<string, Point>): State => ({
  values,
  point: getTopLeftItem(values)[1],
  direction: "right",
});

const isChangeDirection = (m: Move): m is RotateMove =>
  Boolean((m as RotateMove).direction);
const changeDirection = (old: Direction, move: RotateMove): Direction =>
  ({
    R: {
      up: "right",
      down: "left",
      left: "up",
      right: "down",
      key: old,
    },
    L: {
      up: "left",
      down: "right",
      left: "down",
      right: "up",
      key: old,
    },
  }[move.direction][old] as Direction);

////here
const movePoint = (
  initialPoint: Point,
  initialDirection: Direction,
  values: Map<string, Point>,
  move: ForwardMove
): [Point, Direction] =>
  range(0, move.value - 1).reduce(
    ([p, d]) => {
      const [key, dir] = p[d] as [string, Direction | null];
      return [values.get(key)!, dir ?? d];
    },
    [initialPoint, initialDirection]
  );

const applyMove = (state: State, move: Move): State => {
  return {
    values: state.values,
    point: isChangeDirection(move)
      ? state.point
      : movePoint(state.point, state.direction, state.values, move)[0],
    direction: isChangeDirection(move)
      ? changeDirection(state.direction, move)
      : movePoint(state.point, state.direction, state.values, move)[1],
  };
};

const logMap = (values: Map<string, Point>, point: Point): void => {
  const [minX, maxX] = [
    Math.min(...[...values.keys()].map((k) => getCoordinates(k)[0])),
    Math.max(...[...values.keys()].map((k) => getCoordinates(k)[0])),
  ];
  const [minY, maxY] = [
    Math.min(...[...values.keys()].map((k) => getCoordinates(k)[1])),
    Math.max(...[...values.keys()].map((k) => getCoordinates(k)[1])),
  ];
  for (let y = minY; y <= maxY; y++) {
    let line = "";
    for (let x = minX; x <= maxX; x++) {
      const key = getMapKey(x, y);
      if (key === point.key) {
        line += "O";
      } else {
        if (values.has(key)) {
          line += ".";
        } else {
          line += "#";
        }
      }
    }
    console.log(line);
  }
  console.log("-----");
};

const simulate = (field: Field): State =>
  field.moves.reduce((acc, move) => {
    //logMap(acc.values, acc.point);
    return applyMove(acc, move);
  }, initialState(field.values));

const getScore = (state: State): number => {
  const [x, y] = getCoordinates(state.point.key);
  return (
    (y + 1) * 1000 +
    4 * (x + 1) +
    { right: 0, down: 1, left: 2, up: 3, key: 0 }[state.direction]
  );
};

const getAvailableX = (field: Map<string, PointType>): number[] =>
  unique([...field.keys()].map(getCoordinates).map(([x]) => x));

type StreakState = {
  old: number;
  streak: number;
  minStreak: number;
};

const getMinStreak = (state: StreakState, value: number): StreakState => {
  if (state.old === value - 1) {
    return {
      old: value,
      streak: state.streak + 1,
      minStreak: state.minStreak,
    };
  }
  if (state.streak < state.minStreak) {
    return {
      old: value,
      minStreak: state.streak,
      streak: 1,
    };
  }
  return {
    old: value,
    minStreak: state.streak,
    streak: 1,
  };
};

const reduceMinStreak = (arr: number[]): number =>
  arr.reduce(getMinStreak, {
    old: arr[0] - 1,
    streak: 1,
    minStreak: arr.length,
  }).minStreak;

const getMinSegment =
  (field: Map<string, PointType>) =>
  (xFixed: number): number =>
    reduceMinStreak(
      [...field.keys()]
        .map(getCoordinates)
        .filter(([x]) => x === xFixed)
        .map(([, y]) => y)
    );

const getSquareDimension = (field: Map<string, PointType>): number =>
  Math.min(...getAvailableX(field).map(getMinSegment(field)));

type SegmentID =
  | "ab"
  | "bc"
  | "cd"
  | "da"
  | "ef"
  | "fg"
  | "gh"
  | "he"
  | "ae"
  | "bf"
  | "dh"
  | "cg";
type FaceID = "top" | "bottom" | "left" | "right" | "front" | "back";

type Segment = {
  id: SegmentID;
  face: FaceID;
  points: [number, number][];
  direction: Direction;
  isInverse: boolean;
  transform: (
    x: number,
    y: number
  ) => { x: number; y: number; direction: Direction };
};

const nextFace = (
  x: number,
  y: number,
  direction: Direction,
  segments: Segment[]
): ReturnType<Segment["transform"]> | undefined =>
  segments
    .find(
      (s) =>
        s.direction === direction &&
        s.points.some(([px, py]) => px === x && py === y)
    )
    ?.transform(x, y);

const getFirstCubePoint =
  (
    nextPointGetter: (x: number, y: number) => [number, number],
    direction: Direction
  ) =>
  (
    key: string,
    field: Map<string, PointType>,
    segments: Segment[]
  ): [string, Direction | null] => {
    const [x, y] = getCoordinates(key);
    const p = field.get(getMapKey(...nextPointGetter(x, y)));
    if (p === PointType.valid)
      return [getMapKey(...nextPointGetter(x, y)), null];
    if (p === PointType.wall) return [key, null];
    const nextPoint = nextFace(x, y, direction, segments);
    if (!nextPoint) throw new Error("Cannot find next face");
    if (field.get(getMapKey(nextPoint.x, nextPoint.y)) === PointType.wall)
      return [key, null];
    return [getMapKey(nextPoint.x, nextPoint.y), nextPoint.direction];
  };

const getFirstCubePointUp = getFirstCubePoint((x, y) => [x, y - 1], "up");
const getFirstCubePointLeft = getFirstCubePoint((x, y) => [x - 1, y], "left");
const getFirstCubePointRight = getFirstCubePoint((x, y) => [x + 1, y], "right");
const getFirstCubePointDown = getFirstCubePoint((x, y) => [x, y + 1], "down");

const getCubePoint =
  (segments: Segment[]) =>
  (key: string, tempField: Map<string, PointType>): Point => {
    return {
      up: getFirstCubePointUp(key, tempField, segments),
      left: getFirstCubePointLeft(key, tempField, segments),
      right: getFirstCubePointRight(key, tempField, segments),
      down: getFirstCubePointDown(key, tempField, segments),
      key,
    };
  };

type PartialSegment = Omit<Segment, "transform">;

type Face = {
  id: FaceID;
  segments: PartialSegment[];
  corner: [number, number];
};

const getCorner = (
  current: [number, number],
  direction: Direction,
  dim: number
): [number, number] | null =>
  ({
    up: (x: number, y: number) => [x, y - dim],
    down: (x: number, y: number) => [x, y + dim],
    left: (x: number, y: number) => [x - dim, y],
    right: (x: number, y: number) => [x + dim, y],
  }[direction as "up" | "down" | "left" | "right"](...current) as [
    number,
    number
  ]);

function shiftArray<T>(arr: T[], num: number) {
  return num === 0
    ? [...arr]
    : [...arr.slice(-num), ...arr.slice(0, arr.length - num)];
}

//Using vertex as reference it could be simplified, but I have already spent too much time in this thing
const getFaceSegments = (faceId: FaceID, segment: PartialSegment) => {
  const canonicalSegments: Record<
    FaceID,
    { id: SegmentID; isInverse: boolean }[]
  > = {
    front: [
      { id: "ab", isInverse: false },
      { id: "bc", isInverse: false },
      { id: "cd", isInverse: true },
      { id: "da", isInverse: true },
    ],
    left: [
      { id: "ae", isInverse: true },
      { id: "da", isInverse: true },
      { id: "dh", isInverse: true },
      { id: "he", isInverse: true },
    ],
    right: [
      { id: "bf", isInverse: false },
      { id: "fg", isInverse: false },
      { id: "cg", isInverse: false },
      { id: "bc", isInverse: false },
    ],
    back: [
      { id: "ef", isInverse: true },
      { id: "he", isInverse: true },
      { id: "gh", isInverse: false },
      { id: "fg", isInverse: false },
    ],
    bottom: [
      { id: "cd", isInverse: true },
      { id: "cg", isInverse: false },
      { id: "gh", isInverse: true },
      { id: "dh", isInverse: false },
    ],
    top: [
      { id: "ef", isInverse: false },
      { id: "bf", isInverse: true },
      { id: "ab", isInverse: false },
      { id: "ae", isInverse: true },
    ],
  };
  const directionShift = {
    up: 0,
    right: 1,
    down: 2,
    left: 3,
    key: -1,
  } as const;
  const canonicalDirection = canonicalSegments[faceId].findIndex(
    (el) => el.id === segment.id
  );
  let realDirection = directionShift[oppositeDirection(segment.direction)];
  if (realDirection < canonicalDirection) realDirection += 4;
  const shift = realDirection - canonicalDirection;
  const newArr = shiftArray([...canonicalSegments[faceId]], shift);
  if (
    newArr[directionShift[oppositeDirection(segment.direction)]].id !==
    segment.id
  )
    throw new Error("Wrong shift");
  const inversionMap = {
    left: [1, 2],
    right: [1, 2],
    up: [2, 3],
    down: [2, 3],
  };
  return newArr.map((item, index) => {
    const initialDirectionIndex = canonicalSegments[faceId].findIndex(
      (el) => el.id === item.id
    );
    const direction = Object.keys(directionShift)[
      initialDirectionIndex
    ] as keyof typeof inversionMap;
    const isInverse = inversionMap[direction].includes(shift);
    return [item.id, item.isInverse ? !isInverse : isInverse] as const;
  });
};

const getPartialSegments = (
  corner: [number, number],
  segment: PartialSegment,
  faceId: FaceID
): PartialSegment[] => {
  const [
    [topId, topInverse],
    [rightId, rightInverse],
    [downId, downInverse],
    [leftId, leftInverse],
  ] = getFaceSegments(faceId, segment);
  const top: PartialSegment = {
    face: faceId,
    points: generatePoints(corner, segment.points.length),
    direction: "up",
    id: topId,
    isInverse: topInverse,
  };
  const left: PartialSegment = {
    face: faceId,
    points: generatePoints(corner, segment.points.length, "vertical"),
    direction: "left",
    id: leftId,
    isInverse: leftInverse,
  };
  const right: PartialSegment = {
    face: faceId,
    points: generatePoints(
      top.points[top.points.length - 1],
      segment.points.length,
      "vertical"
    ),
    direction: "right",
    id: rightId,
    isInverse: rightInverse,
  };
  const down: PartialSegment = {
    face: faceId,
    points: generatePoints(
      left.points[left.points.length - 1],
      segment.points.length
    ),
    direction: "down",
    id: downId,
    isInverse: downInverse,
  };
  return [top, left, right, down];
};

const getNextFace =
  (current: Face, field: Map<string, PointType>) =>
  (segment: PartialSegment): Face | null => {
    const nextFaceMap: Record<FaceID, Partial<Record<SegmentID, FaceID>>> = {
      front: { ab: "top", bc: "right", da: "left", cd: "bottom" },
      left: { ae: "top", he: "back", dh: "bottom", da: "front" },
      right: { bf: "top", fg: "back", bc: "front", cg: "bottom" },
      back: { ef: "top", fg: "right", he: "left", gh: "bottom" },
      top: { ab: "front", bc: "right", ae: "left", ef: "back" },
      bottom: { cd: "front", cg: "right", dh: "left", gh: "back" },
    };
    const nextFace = nextFaceMap[current.id][segment.id];
    if (!nextFace) return null;
    const nextCorner = getCorner(
      current.corner,
      segment.direction,
      segment.points.length
    );
    if (!nextCorner) return null;
    if (!field.get(getMapKey(...nextCorner))) return null;
    const segments = getPartialSegments(nextCorner, segment, nextFace);
    return {
      id: nextFace,
      segments,
      corner: nextCorner,
    };
  };

const getDirections = (face: Face, field: Map<string, PointType>): Face[] =>
  face.segments
    .map(getNextFace(face, field))
    .filter((f) => f !== null) as Face[];

type FaceCache = Partial<Record<FaceID, Face>>;

const BFS = (
  face: Face,
  dim: number,
  cache: FaceCache,
  field: Map<string, PointType>
): Face[] => {
  if (cache[face.id]) return [];
  cache[face.id] = face;
  return [
    face,
    ...getDirections(face, field).flatMap((f) => BFS(f, dim, cache, field)),
  ];
};

const generatePoints = (
  start: [number, number],
  dim: number,
  axis = "horizontal"
): [number, number][] =>
  range(0, dim - 1).map((i) =>
    axis === "vertical" ? [start[0], start[1] + i] : [start[0] + i, start[1]]
  );

const getInitialFace = (field: Map<string, PointType>, dim: number): Face => {
  const corner = getCoordinates(getTopLeftItem(field)[0]);
  const bottom: PartialSegment = {
    id: "ab",
    face: "front",
    points: generatePoints(corner, dim),
    direction: "down",
    isInverse: false,
  };
  return {
    id: "front",
    segments: getPartialSegments(corner, bottom, "front"),
    corner,
  };
};

const getFaces = (dim: number, field: Map<string, PointType>): Face[] => {
  const cache: FaceCache = {};
  return BFS(getInitialFace(field, dim), dim, cache, field);
};

const oppositeDirection = (d: Direction): Direction =>
  ({ up: "down", down: "up", left: "right", right: "left", key: "key" }[
    d
  ] as Direction);

const fillTransform =
  (segments: PartialSegment[]) =>
  (partial: PartialSegment): Segment => {
    const destination = segments.find(
      (s) => s.id === partial.id && s.face !== partial.face
    );
    const shouldInvertIndex = destination?.isInverse !== partial.isInverse;
    return {
      ...partial,
      transform: (x, y) => {
        const index = partial.points.findIndex(
          ([xp, yp]) => xp === x && yp === y
        );
        const destinationCoord =
          destination?.points[
            shouldInvertIndex ? destination.points.length - 1 - index : index
          ];
        if (!destinationCoord) throw new Error("Cannot find destination");
        return {
          x: destinationCoord[0],
          y: destinationCoord[1],
          direction: oppositeDirection(destination.direction),
        };
      },
    };
  };

const getSegments =
  (field: Map<string, PointType>) =>
  (dim: number): Segment[] =>
    pipe(
      getFaces(dim, field).flatMap((f) => f.segments),
      (partials) => partials.map(fillTransform(partials))
    );

const firtPartSolution = flow(
  readFromFile,
  mapLinesToArray,
  toField(getPoint),
  simulate,
  getScore,
  logResult
);

//firtPartSolution(`${__dirname}/input/input.txt`);

const secondPartSolution = flow(
  readFromFile,
  mapLinesToArray,
  (lines: string[]) => {
    const tempField = new Map<string, PointType>();
    for (let i = 0; i < lines.length - 1; i++) {
      lines[i].split("").forEach((c, j) => {
        if (c === ".") {
          tempField.set(getMapKey(j, i), PointType.valid);
        }
        if (c === "#") {
          tempField.set(getMapKey(j, i), PointType.wall);
        }
      });
    }
    return pipe(
      tempField,
      (field) => pipe(field, getSquareDimension, getSegments(field)),
      (segments) => toField(getCubePoint(segments))(lines)
    );
  },
  simulate,
  getScore,
  logResult
);
secondPartSolution(`${__dirname}/input/input.txt`);
