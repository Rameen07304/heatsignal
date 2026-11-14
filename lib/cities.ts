export interface City {
  name: string;
  country: string;
  lat: number;
  lon: number;
  /** Approximate metro-area population in millions. */
  pop?: number;
}

// Heat-exposed cities worldwide: [name, country, lat, lon, approx. metro population (millions)].
// Populations are rounded estimates for scale ("how many people live under this heat"), not census data.
const ROWS: [string, string, number, number, number][] = [
  // South Asia
  ["Karachi", "Pakistan", 24.86, 67.01, 17],
  ["Lahore", "Pakistan", 31.55, 74.35, 13],
  ["Multan", "Pakistan", 30.2, 71.47, 2.1],
  ["Peshawar", "Pakistan", 34.01, 71.58, 2.3],
  ["Islamabad", "Pakistan", 33.69, 73.05, 1.2],
  ["Jacobabad", "Pakistan", 28.28, 68.44, 0.2],
  ["Delhi", "India", 28.61, 77.21, 33],
  ["Mumbai", "India", 19.08, 72.88, 21],
  ["Kolkata", "India", 22.57, 88.36, 15],
  ["Chennai", "India", 13.08, 80.27, 12],
  ["Hyderabad", "India", 17.39, 78.49, 11],
  ["Bengaluru", "India", 12.97, 77.59, 14],
  ["Ahmedabad", "India", 23.02, 72.57, 8.7],
  ["Nagpur", "India", 21.15, 79.09, 3],
  ["Dhaka", "Bangladesh", 23.81, 90.41, 23],
  ["Chittagong", "Bangladesh", 22.36, 91.78, 5.4],
  ["Colombo", "Sri Lanka", 6.93, 79.86, 0.6],
  ["Kathmandu", "Nepal", 27.72, 85.32, 1.6],
  // Middle East
  ["Dubai", "United Arab Emirates", 25.28, 55.3, 3.6],
  ["Abu Dhabi", "United Arab Emirates", 24.45, 54.65, 1.6],
  ["Riyadh", "Saudi Arabia", 24.71, 46.68, 7.7],
  ["Jeddah", "Saudi Arabia", 21.49, 39.19, 4.9],
  ["Mecca", "Saudi Arabia", 21.39, 39.86, 2.1],
  ["Doha", "Qatar", 25.29, 51.53, 2.4],
  ["Kuwait City", "Kuwait", 29.38, 47.99, 3.3],
  ["Muscat", "Oman", 23.59, 58.41, 1.6],
  ["Manama", "Bahrain", 26.23, 50.59, 0.7],
  ["Baghdad", "Iraq", 33.31, 44.36, 7.7],
  ["Basra", "Iraq", 30.51, 47.78, 1.4],
  ["Tehran", "Iran", 35.69, 51.39, 9.5],
  ["Ahvaz", "Iran", 31.32, 48.67, 1.3],
  ["Aden", "Yemen", 12.79, 45.02, 1.1],
  ["Amman", "Jordan", 31.95, 35.93, 2.2],
  ["Istanbul", "Türkiye", 41.01, 28.98, 15.8],
  // Africa
  ["Cairo", "Egypt", 30.04, 31.24, 22],
  ["Khartoum", "Sudan", 15.5, 32.56, 6.3],
  ["Lagos", "Nigeria", 6.52, 3.38, 16],
  ["Kano", "Nigeria", 12.0, 8.52, 4.3],
  ["Abuja", "Nigeria", 9.06, 7.49, 3.8],
  ["Accra", "Ghana", 5.6, -0.19, 2.6],
  ["Dakar", "Senegal", 14.72, -17.47, 3.3],
  ["Bamako", "Mali", 12.64, -8.0, 2.9],
  ["Niamey", "Niger", 13.51, 2.13, 1.4],
  ["Ouagadougou", "Burkina Faso", 12.37, -1.52, 3.2],
  ["N'Djamena", "Chad", 12.13, 15.06, 1.6],
  ["Kinshasa", "DR Congo", -4.44, 15.27, 17],
  ["Luanda", "Angola", -8.84, 13.23, 9.3],
  ["Nairobi", "Kenya", -1.29, 36.82, 5.3],
  ["Mombasa", "Kenya", -4.04, 39.67, 1.4],
  ["Dar es Salaam", "Tanzania", -6.79, 39.21, 7.8],
  ["Addis Ababa", "Ethiopia", 9.03, 38.74, 5.5],
  ["Djibouti", "Djibouti", 11.59, 43.15, 0.6],
  ["Maputo", "Mozambique", -25.97, 32.57, 1.2],
  ["Johannesburg", "South Africa", -26.2, 28.05, 6.2],
  ["Marrakesh", "Morocco", 31.63, -8.0, 1.0],
  // East and Southeast Asia
  ["Bangkok", "Thailand", 13.76, 100.5, 11],
  ["Ho Chi Minh City", "Vietnam", 10.82, 106.63, 9.6],
  ["Hanoi", "Vietnam", 21.03, 105.85, 5.4],
  ["Manila", "Philippines", 14.6, 120.98, 14.9],
  ["Jakarta", "Indonesia", -6.21, 106.85, 11],
  ["Surabaya", "Indonesia", -7.26, 112.75, 3.1],
  ["Singapore", "Singapore", 1.35, 103.82, 5.9],
  ["Kuala Lumpur", "Malaysia", 3.14, 101.69, 8.8],
  ["Yangon", "Myanmar", 16.84, 96.17, 5.7],
  ["Phnom Penh", "Cambodia", 11.56, 104.92, 2.3],
  ["Hong Kong", "China", 22.32, 114.17, 7.5],
  ["Guangzhou", "China", 23.13, 113.26, 14.6],
  ["Shanghai", "China", 31.23, 121.47, 29],
  ["Chongqing", "China", 29.56, 106.55, 17.8],
  ["Wuhan", "China", 30.59, 114.31, 8.7],
  ["Taipei", "Taiwan", 25.03, 121.57, 2.7],
  ["Tokyo", "Japan", 35.69, 139.69, 37],
  ["Osaka", "Japan", 34.69, 135.5, 19],
  ["Seoul", "South Korea", 37.57, 126.98, 10],
  // Americas
  ["Phoenix", "United States", 33.45, -112.07, 5.0],
  ["Las Vegas", "United States", 36.17, -115.14, 2.3],
  ["Houston", "United States", 29.76, -95.37, 7.3],
  ["New Orleans", "United States", 29.95, -90.07, 1.3],
  ["Miami", "United States", 25.76, -80.19, 6.2],
  ["Monterrey", "Mexico", 25.69, -100.32, 5.3],
  ["Mexicali", "Mexico", 32.62, -115.45, 1.1],
  ["Havana", "Cuba", 23.11, -82.37, 2.1],
  ["Panama City", "Panama", 8.98, -79.52, 1.9],
  ["Barranquilla", "Colombia", 10.97, -74.8, 2.3],
  ["Guayaquil", "Ecuador", -2.17, -79.92, 3.1],
  ["Manaus", "Brazil", -3.12, -60.02, 2.3],
  ["Recife", "Brazil", -8.05, -34.88, 4.2],
  ["Rio de Janeiro", "Brazil", -22.91, -43.17, 13.7],
  ["São Paulo", "Brazil", -23.55, -46.63, 22.6],
  ["Asunción", "Paraguay", -25.26, -57.58, 3.5],
  ["Buenos Aires", "Argentina", -34.6, -58.38, 15.5],
  // Europe and Oceania
  ["Seville", "Spain", 37.39, -5.98, 1.5],
  ["Madrid", "Spain", 40.42, -3.7, 6.8],
  ["Rome", "Italy", 41.9, 12.5, 4.3],
  ["Athens", "Greece", 37.98, 23.73, 3.2],
  ["Paris", "France", 48.86, 2.35, 11],
  ["Darwin", "Australia", -12.46, 130.84, 0.15],
  ["Brisbane", "Australia", -27.47, 153.03, 2.6],
  ["Perth", "Australia", -31.95, 115.86, 2.2],
  ["Sydney", "Australia", -33.87, 151.21, 5.4],
  ["Port Moresby", "Papua New Guinea", -9.44, 147.18, 0.4],
];

export const WORLD_CITIES: City[] = ROWS.map(([name, country, lat, lon, pop]) => ({
  name,
  country,
  lat,
  lon,
  pop,
}));

/** Cities pinned to "My cities" on first visit. */
export const DEFAULT_CITIES: City[] = ["Karachi", "Lahore", "Dubai", "Abu Dhabi", "Tokyo", "Riyadh"].map(
  (name) => WORLD_CITIES.find((c) => c.name === name)!,
);

export const cityKey = (c: Pick<City, "lat" | "lon">) => `${c.lat},${c.lon}`;

export const cityHref = (c: City) =>
  `/city/${c.lat}/${c.lon}?name=${encodeURIComponent(c.name)}&country=${encodeURIComponent(c.country)}`;
