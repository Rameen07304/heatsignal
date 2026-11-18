/** Vapour pressure in hPa from temperature (°C) and relative humidity (%). */
export function vapourPressure(t: number, rh: number): number {
  return (rh / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t));
}

/**
 * Psychrometric wet-bulb temperature (°C) from temperature and relative humidity.
 * Stull (2011), J. Appl. Meteor. Climatol. — valid for RH 5–99 % at sea-level pressure.
 */
export function wetBulb(t: number, rh: number): number {
  return (
    t * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(t + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * rh ** 1.5 * Math.atan(0.023101 * rh) -
    4.686035
  );
}

/** Australian BoM simplified WBGT. Assumes a sunny day with light wind. */
const wbgtSun = (t: number, rh: number) => 0.567 * t + 0.393 * vapourPressure(t, rh) + 3.94;

/** ISO 7243 WBGT without solar load (0.7·Tw + 0.3·Tg, with globe ≈ air temperature). */
const wbgtShade = (t: number, rh: number) => 0.7 * wetBulb(t, rh) + 0.3 * t;

// Note: radiation (W/m²) at which the BoM "sunny day" assumption is taken to hold fully.
// A linear blend, not a globe-temperature model — swap in Liljegren (2008) if this needs to be
// defended to a met service; tune this constant against station WBGT readings if you get any.
const FULL_SUN = 500;

/**
 * Wet Bulb Globe Temperature (°C).
 *
 * The BoM formula has the sun baked in, so on its own it overstates heat stress at night by
 * several degrees in humid climates. When shortwave radiation (W/m²) is supplied we blend from
 * the ISO shade formula (no sun) up to the BoM formula (full sun). Without it, BoM is used as is.
 */
export function wbgt(t: number, rh: number, solar?: number): number {
  const sun = wbgtSun(t, rh);
  if (solar == null) return sun;
  const shade = Math.min(wbgtShade(t, rh), sun);
  return shade + Math.min(Math.max(solar / FULL_SUN, 0), 1) * (sun - shade);
}
