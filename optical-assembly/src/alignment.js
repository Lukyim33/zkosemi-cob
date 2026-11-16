// Coordinates are dimensionless transverse offsets. Power is relative to the peak
// of this illustrative single-channel overlap model, not a calibrated measurement.
export const initialOffset = Object.freeze({ x: -0.68, z: 0.62 });
export const alignmentThreshold = 93;
export function alignmentSample(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return { power: 0, ready: false };
  const horizontal = Math.min(1, Math.max(-1, x));
  const vertical = Math.min(1, Math.max(-1, z));
  const power = 100 * Math.exp(-2.4 * (horizontal ** 2 + vertical ** 2));
  return { power, ready: power >= alignmentThreshold };
}
