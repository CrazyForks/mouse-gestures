export interface Point {
  x: number
  y: number
}

interface Vector {
  x: number
  y: number
  angle: number
  distance: number
}

interface MatchResult {
  isMatched: boolean
  similarity: number
}

interface TrajectoryMatchOptions {
  angleThreshold?: number // Angular tolerance threshold
  lengthTolerance?: number // length tolerance ratio
  minSimilarity?: number // Minimum similarity
  keyPointOptions?: {
    // Configuration of key point parameters
    minAngleChange?: number // Minimum angle change threshold
    minSegmentRatio?: number // Minimum line scale
  }
  turnCountPenalty?: number // Penalty factor for number of turns
}

export class Trajectory {
  public static trajectory: Point[] = []

  public static addPoint(point: Point) {
    this.trajectory.push(point)
  }

  public static delPoint() {
    this.trajectory.pop()
  }

  public static clear() {
    this.trajectory = []
  }

  // Simplifying trajectories using the Douglas-Peucker algorithm
  public static simplifyTrajectory(
    points: Point[],
    tolerance: number = 10
  ): Point[] {
    if (points.length <= 2) return points

    let maxDistance = 0
    let maxIndex = 0

    // Find the point furthest from the first and last line segments
    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.getPointToLineDistance(
        points[i],
        points[0],
        points[points.length - 1]
      )
      if (distance > maxDistance) {
        maxDistance = distance
        maxIndex = i
      }
    }

    // If the maximum distance is less than the tolerance, then return directly to the first and last points
    if (maxDistance <= tolerance) {
      return [points[0], points[points.length - 1]]
    }

    // Recursively simplify the before and after
    const firstHalf = this.simplifyTrajectory(
      points.slice(0, maxIndex + 1),
      tolerance
    )
    const secondHalf = this.simplifyTrajectory(
      points.slice(maxIndex),
      tolerance
    )

    // Merge results to remove duplicate points
    return firstHalf.slice(0, -1).concat(secondHalf)
  }

  // Calculate the distance from the point to the line segment
  private static getPointToLineDistance(
    point: Point,
    lineStart: Point,
    lineEnd: Point
  ): number {
    const A = point.x - lineStart.x
    const B = point.y - lineStart.y
    const C = lineEnd.x - lineStart.x
    const D = lineEnd.y - lineStart.y

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1

    if (lenSq !== 0) {
      param = dot / lenSq
    }

    let xx: number, yy: number

    if (param < 0) {
      xx = lineStart.x
      yy = lineStart.y
    } else if (param > 1) {
      xx = lineEnd.x
      yy = lineEnd.y
    } else {
      xx = lineStart.x + param * C
      yy = lineStart.y + param * D
    }

    // Calculate the distance between two points
    const p1 = point
    const p2 = { x: xx, y: yy }
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  }

  // -----------------------------------------------------Match---------------------------------------------------------

  private static getDistance(p1: Point, p2: Point): number {
    if (!p1 || !p2) return 0
    return Math.hypot(p2.x - p1.x, p2.y - p1.y)
  }

  private static getVector(start: Point, end: Point): Vector {
    if (!start || !end) return { x: 0, y: 0, angle: 0, distance: 0 }
    const x = end.x - start.x
    const y = end.y - start.y
    const distance = this.getDistance(start, end)
    const angle = distance > 0 ? Math.atan2(y, x) : 0
    return { x, y, angle, distance }
  }

  private static getAngleDifference(a: number, b: number): number {
    const diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
    return diff < -Math.PI ? diff + Math.PI * 2 : diff
  }

  // Key point extraction
  private static extractKeyPoints(
    points: Point[],
    options: {
      minAngleChange: number
      minSegmentLengthRatio: number
    } = {
      minAngleChange: Math.PI / 9,
      minSegmentLengthRatio: 0.15
    }
  ): Point[] {
    if (!points || points.length < 2) return []

    // Handling of two points
    if (points.length === 2) return [points[0], points[1]]

    const totalLength = this.getTrajectoryLength(points)
    const minSegmentLength = Math.max(
      totalLength * options.minSegmentLengthRatio,
      0.001 // Preventing de-zeroing
    )
    const keyPoints: Point[] = [points[0]]
    let lastVector = this.getVector(points[0], points[1])
    let accumulatedAngle = 0

    for (let i = 2; i < points.length; i++) {
      const currentVector = this.getVector(points[i - 1], points[i])
      const angleDiff = Math.abs(
        this.getAngleDifference(lastVector.angle, currentVector.angle)
      )
      const segmentLength = this.getDistance(
        keyPoints[keyPoints.length - 1],
        points[i]
      )

      accumulatedAngle += angleDiff

      if (
        accumulatedAngle > options.minAngleChange ||
        segmentLength > minSegmentLength
      ) {
        keyPoints.push(points[i - 1])
        lastVector = currentVector
        accumulatedAngle = 0
      }
    }

    keyPoints.push(points[points.length - 1])
    return this.simplifyKeyPoints(keyPoints, minSegmentLength)
  }

  // Secondary simplification key points
  private static simplifyKeyPoints(points: Point[], minDist: number): Point[] {
    // Calculate the average distance between key points
    const avgDistance = this.getTrajectoryLength(points) / (points.length - 1)
    // Dynamic adjustment factor: the larger the spacing, the smaller the factor
    const dynamicFactor = Math.min(0.6, 0.3 * (avgDistance / minDist))
    return points.filter(
      (p, i) =>
        i === 0 ||
        i === points.length - 1 ||
        this.getDistance(p, points[i - 1]) >= minDist * dynamicFactor
    )
  }

  // Get the total length of the track
  private static getTrajectoryLength(points: Point[]): number {
    return points.reduce(
      (sum, p, i) => (i > 0 ? sum + this.getDistance(points[i - 1], p) : 0),
      0
    )
  }

  // Trajectory feature extraction
  private static getTrajectoryFeatures(
    points: Point[],
    keyPointOptions?: {
      minAngleChange?: number
      minSegmentLengthRatio?: number
    }
  ): {
    directionSequence: number[]
    relativeAngles: number[]
    normalizedPoints: Point[]
    keyPoints: Point[]
    turnCount: number
  } {
    let turnCount = 0
    if (!points || points.length < 2) {
      return {
        directionSequence: [],
        relativeAngles: [],
        normalizedPoints: [],
        keyPoints: [],
        turnCount
      }
    }

    // Addressing two special cases
    if (points.length === 2) {
      const vec = this.getVector(points[0], points[1])
      const normalized = this.normalizeTrajectory(points)
      return {
        directionSequence: [vec.angle],
        relativeAngles: [],
        normalizedPoints: normalized,
        keyPoints: points,
        turnCount
      }
    }

    const finalOptions = {
      minAngleChange: keyPointOptions?.minAngleChange ?? Math.PI / 9,
      minSegmentLengthRatio: keyPointOptions?.minSegmentLengthRatio ?? 0.15
    }
    const keyPoints = this.extractKeyPoints(points, finalOptions) // Key point extraction
    const normalized = this.normalizeTrajectory(keyPoints) // Normalization based on keypoints
    const directions: number[] = []
    const relativeAngles: number[] = []

    for (let i = 1; i < normalized.length; i++) {
      const vec = this.getVector(normalized[i - 1], normalized[i])
      directions.push(vec.angle)
      if (i >= 2) {
        const prevVec = this.getVector(normalized[i - 2], normalized[i - 1])
        const angleDiff = this.getAngleDifference(prevVec.angle, vec.angle)
        relativeAngles.push(angleDiff)
        // Counts the number of turns above the angle threshold
        if (Math.abs(angleDiff) >= finalOptions.minAngleChange) {
          turnCount++
        }
      }
    }

    return {
      directionSequence: directions,
      relativeAngles,
      normalizedPoints: normalized,
      keyPoints,
      turnCount
    }
  }

  // trajectory normalization
  private static normalizeTrajectory(points: Point[]): Point[] {
    if (!points || points.length < 2) return []

    const centroid = this.getCentroid(points)
    const totalLength = this.getTrajectoryLength(points)
    const scale = totalLength > 0.001 ? 1 / totalLength : 1

    return points.map((p) => ({
      x: (p.x - centroid.x) * scale,
      y: (p.y - centroid.y) * scale
    }))
  }

  private static getCentroid(points: Point[]): Point {
    return points.reduce(
      (sum, p) => ({
        x: sum.x + p.x / points.length,
        y: sum.y + p.y / points.length
      }),
      { x: 0, y: 0 }
    )
  }

  // Similarity calculation
  public static matchTrajectories(
    t1: Point[],
    t2: Point[],
    options: TrajectoryMatchOptions = {}
  ): MatchResult {
    options = {
      angleThreshold: Math.PI / 4,
      lengthTolerance: 0.3,
      minSimilarity: 0.75,
      turnCountPenalty: 0.1,
      ...options
    }

    // Handling of null cases
    if (!t1 || !t2 || t1.length < 2 || t2.length < 2) {
      return { isMatched: false, similarity: 0 }
    }

    // Direct treatment of the case of two-point straight lines
    if (t1.length === 2 && t2.length === 2) {
      const vec1 = this.getVector(t1[0], t1[1])
      const vec2 = this.getVector(t2[0], t2[1])
      const angleDiff = Math.abs(
        this.getAngleDifference(vec1.angle, vec2.angle)
      )
      const similarity = Math.exp(-angleDiff / options.angleThreshold)
      return {
        isMatched: similarity >= options.minSimilarity,
        similarity
      }
    }

    // Extraction Characteristics
    const f1 = this.getTrajectoryFeatures(t1, options.keyPointOptions)
    const f2 = this.getTrajectoryFeatures(t2, options.keyPointOptions)

    // Calculate the difference in the number of turns
    const turnCountDiff = Math.abs(f1.turnCount - f2.turnCount)
    const turnPenalty = Math.exp(-turnCountDiff * options.turnCountPenalty)

    // directional sequence matching
    const directionSimilarity = this.dynamicTimeWarping(
      f1.directionSequence,
      f2.directionSequence,
      (a, b) =>
        Math.exp(
          -Math.abs(this.getAngleDifference(a, b)) / options.angleThreshold
        )
    )

    // Relative Angle Matching
    const angleSimilarity = this.dynamicTimeWarping(
      f1.relativeAngles,
      f2.relativeAngles,
      (a, b) => Math.exp(-Math.abs(a - b) / (options.angleThreshold * 0.5))
    )

    // Shape Matching(based on key points)
    const shapeSimilarity = this.compareShapes(
      f1.normalizedPoints,
      f2.normalizedPoints,
      options.angleThreshold
    )

    // Combined similarity
    const baseSimilarity =
      0.4 * directionSimilarity + 0.3 * angleSimilarity + 0.3 * shapeSimilarity
    const similarity = Math.max(0, Math.min(1, baseSimilarity * turnPenalty))

    return {
      isMatched: similarity >= options.minSimilarity,
      similarity
    }
  }

  // Dynamic time regularization algorithm
  private static dynamicTimeWarping(
    seq1: number[],
    seq2: number[],
    similarityFn: (a: number, b: number) => number
  ): number {
    // Handling empty sequences
    if (seq1.length === 0 || seq2.length === 0) {
      return seq1.length === seq2.length ? 1 : 0
    }

    const m = seq1.length
    const n = seq2.length
    const dtw: number[][] = Array.from({ length: m + 1 }, () =>
      Array(n + 1).fill(Infinity)
    )
    dtw[0][0] = 0

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = 1 - similarityFn(seq1[i - 1], seq2[j - 1])
        dtw[i][j] =
          cost +
          Math.min(
            dtw[i - 1][j], // insertion
            dtw[i][j - 1], // deletion
            dtw[i - 1][j - 1] // match
          )
      }
    }

    // Calculate the normalized similarity
    const maxPathLength = Math.max(m, n)
    return 1 - dtw[m][n] / maxPathLength
  }

  // Shape Matching
  private static compareShapes(
    points1: Point[],
    points2: Point[],
    angleThreshold: number
  ): number {
    const CENTROID_WEIGHT = 0.2
    const PATH_WEIGHT = 0.5
    const DIRECTION_WEIGHT = 0.3

    // path similarity
    const pathSimilarity = this.dynamicTimeWarping(
      points1.flatMap((p) => [p.x, p.y]),
      points2.flatMap((p) => [p.x, p.y]),
      (a, b) => Math.exp(-Math.abs(a - b))
    )

    // Directional distribution similarity
    const dirs1 = this.getDirectionDistribution(points1)
    const dirs2 = this.getDirectionDistribution(points2)
    const dirSimilarity = this.cosineSimilarity(dirs1, dirs2)

    // Key Point Angle Matching
    const angleSimilarity = this.compareKeyPointAngles(
      points1,
      points2,
      angleThreshold
    )

    return (
      PATH_WEIGHT * pathSimilarity +
      DIRECTION_WEIGHT * dirSimilarity +
      CENTROID_WEIGHT * angleSimilarity
    )
  }

  // Comparison of key point perspectives
  private static compareKeyPointAngles(
    points1: Point[],
    points2: Point[],
    threshold: number
  ): number {
    const minLen = Math.min(points1.length, points2.length)
    let matchCount = 0

    for (let i = 0; i < minLen; i++) {
      const vec1 = this.getVector(
        points1[i],
        points1[Math.min(i + 1, points1.length - 1)]
      )
      const vec2 = this.getVector(
        points2[i],
        points2[Math.min(i + 1, points2.length - 1)]
      )
      const diff = Math.abs(this.getAngleDifference(vec1.angle, vec2.angle))
      if (diff <= threshold) matchCount++
    }

    return matchCount / Math.max(points1.length, points2.length)
  }

  // Histogram of directional distribution
  private static getDirectionDistribution(points: Point[]): number[] {
    const bins = Array(8).fill(0)
    if (!points || points.length < 2) return bins

    for (let i = 1; i < points.length; i++) {
      const angle = Math.atan2(
        points[i].y - points[i - 1].y,
        points[i].x - points[i - 1].x
      )
      const bin = Math.floor((angle + Math.PI) / (Math.PI / 4)) % 8
      bins[bin] += 1
    }
    return bins.map((v) => v / (points.length - 1))
  }

  // cosine similarity
  private static cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, v, i) => sum + v * b[i], 0)
    const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0))
    const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0))
    return normA * normB > 0 ? dot / (normA * normB) : 0
  }
}
