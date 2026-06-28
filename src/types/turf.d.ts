declare module '@turf/boolean-point-in-polygon' {
  // We declare the default export as 'any' to bypass strict TS checks
  // since the Turf package's exports map is misconfigured for modern bundlers.
  const booleanPointInPolygon: any;
  export default booleanPointInPolygon;
}

declare module '@turf/helpers' {
  export const point: any;
  export const polygon: any;
}
