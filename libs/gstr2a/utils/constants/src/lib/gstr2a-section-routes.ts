/** Maps GSTR-2A hub tile ids to `/gstr2a/{segment}` routes. */
export const GSTR2A_TILE_ROUTE_SEGMENTS: Readonly<Record<string, string>> = {
  b2b: 'b2b',
  b2ba: 'b2ba',
  cdn: 'cdn',
  cdna: 'cdna',
  eco: 'ecom',
  ecoa: 'ecoma',
  isd: 'isd',
  isda: 'isda',
  tds: 'tds',
  tdsa: 'tdsa',
  tcs: 'tcs',
  'imp-goods': 'impg',
  'imp-sez': 'impgsez',
};
