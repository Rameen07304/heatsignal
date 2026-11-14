/** Vapour pressure in hPa from temperature (°C) and relative humidity (%). */
export function vapourPressure(t: number, rh: number): number {
  return (rh / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t));
}

/**
 * Wet Bulb Globe Temperature (°C), Australian BoM simplified shade formula.
 * Assumes moderate sun and light wind — it does not use wind or radiation.
 */
export function wbgt(t: number, rh: number): number {
  return 0.567 * t + 0.393 * vapourPressure(t, rh) + 3.94;
}
