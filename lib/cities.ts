export interface City {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

export const DEFAULT_CITIES: City[] = [
  { name: "Karachi", country: "Pakistan", lat: 24.86, lon: 67.01 },
  { name: "Lahore", country: "Pakistan", lat: 31.55, lon: 74.35 },
  { name: "Dubai", country: "United Arab Emirates", lat: 25.28, lon: 55.3 },
  { name: "Abu Dhabi", country: "United Arab Emirates", lat: 24.45, lon: 54.65 },
  { name: "Tokyo", country: "Japan", lat: 35.69, lon: 139.69 },
  { name: "Riyadh", country: "Saudi Arabia", lat: 24.71, lon: 46.68 },
];

export const cityKey = (c: Pick<City, "lat" | "lon">) => `${c.lat},${c.lon}`;

export const cityHref = (c: City) =>
  `/city/${c.lat}/${c.lon}?name=${encodeURIComponent(c.name)}&country=${encodeURIComponent(c.country)}`;
