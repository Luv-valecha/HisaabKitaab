const PATHS = {
  home: "M3 11 12 3l9 8v10h-6v-6H9v6H3z",
  groups: "M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zM8 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zM8 13c-3 0-6 1.5-6 4v3h12v-3c0-2.500-3-4-6-4zm8 0c-.5 0-1 0-1.500.1 1.600 1 2.500 2.300 2.500 3.900v3h6v-3c0-2.500-3-4-7-4z",
  friends: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4 0-8 2-8 5v2h16v-2c0-3-4-5-8-5z",
  budget: "M3 6h18v12H3zM3 10h18M7 15h3",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  settle: "M7 7h13l-4-4M17 17H4l4 4",
  theme: "M12 3a9 9 0 1 0 9 9c0 2-2 3-4 3h-2a2 2 0 0 0-1 3.700A9 9 0 0 1 12 3z",
  user: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zM4 21c0-4 4-6 8-6s8 2 8 6",
  bell: "M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21a2 2 0 0 0 4 0",
  plus: "M12 5v14M5 12h14",
};
export default function Icon({ name, size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PATHS[name]} /></svg>;
}
