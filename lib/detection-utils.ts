export type RoboflowPrediction = {
  x: number; // center x in pixels
  y: number; // center y in pixels
  width: number; // box width in pixels
  height: number; // box height in pixels
  confidence: number;
  class: string;
};

const FREQUENCIES = [500, 1000, 2000, 4000];

/**
 * Map pixel coordinates to thresholds for the four standard frequencies.
 * Heuristic approach (MVP): split the image width into 4 equal columns centered
 * and map each detected marker's x position to nearest frequency. Map y to dB
 * using inverted linear mapping across image height (0 at top ~ 0 dB, bottom ~130 dB HL).
 */
export function deriveThresholdsFromDetections(
  predictions: RoboflowPrediction[],
  imageWidth: number,
  imageHeight: number,
): { left?: number[]; right?: number[] } {
  if (!predictions || predictions.length === 0) return {};

  const leftMap: Record<number, number[]> = {};
  const rightMap: Record<number, number[]> = {};

  const freqCenters = FREQUENCIES.map((_, i) => ((i + 0.5) / FREQUENCIES.length) * imageWidth);

  const toDb = (y: number) => {
    const ratio = Math.max(0, Math.min(1, y / imageHeight));
    // Invert so top = low dB, bottom = high dB
    const db = Math.round((1 - ratio) * 130);
    return db;
  };

  for (const p of predictions) {
    const cx = p.x;
    const cy = p.y;
    const db = toDb(cy);

    // Determine nearest frequency index
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < freqCenters.length; i++) {
      const d = Math.abs(cx - freqCenters[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    // Decide ear by predicted class label; common labels: 'O', 'X', 'dot', 'left', 'right'
    const cls = String(p.class).toLowerCase();
    const isLeft = cls.includes("o") || cls.includes("left");
    const isRight = cls.includes("x") || cls.includes("right");

    if (isLeft) {
      leftMap[bestIdx] = leftMap[bestIdx] || [];
      leftMap[bestIdx].push(db);
    } else if (isRight) {
      rightMap[bestIdx] = rightMap[bestIdx] || [];
      rightMap[bestIdx].push(db);
    } else {
      // Unknown class; attempt to infer by x-position: left half -> left ear
      if (cx < imageWidth / 2) {
        leftMap[bestIdx] = leftMap[bestIdx] || [];
        leftMap[bestIdx].push(db);
      } else {
        rightMap[bestIdx] = rightMap[bestIdx] || [];
        rightMap[bestIdx].push(db);
      }
    }
  }

  const finalize = (map: Record<number, number[]>) => {
    const arr: number[] = [];
    for (let i = 0; i < FREQUENCIES.length; i++) {
      const values = map[i];
      if (!values || values.length === 0) {
        arr.push(NaN);
      } else {
        // average if multiple dots fall in same freq bin
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        arr.push(avg);
      }
    }
    return arr;
  };

  const leftArr = finalize(leftMap);
  const rightArr = finalize(rightMap);

  return { left: leftArr, right: rightArr };
}
