import type { Bounds, LatLon } from "@/lib/types";

// ---------------------------------------------------------------------------
// Interfaces between the Google-map components. Two people/agents build the
// two halves in parallel against this file; do not change it without telling
// the other side.
//
//   MapShell (owner: B)  renders  GlobeView (owner: C) | LocalMap (owner: B)
//                        + SearchBar (owner: C) + SideMenu (owner: B)
//
// Everything renders inside <APIProvider apiKey=... libraries={['places','maps3d']}>
// from @vis.gl/react-google-maps, so components may call useMapsLibrary().
// ---------------------------------------------------------------------------

export type ViewMode = "globe" | "local";

/** A place the user searched for or picked. */
export type PlaceSelection = {
  lat: number;
  lon: number;
  label: string;
  /** Google's viewport for the place, when known; LocalMap fits to it. */
  viewport?: Bounds;
};

/** Photorealistic 3D globe (Map3DElement). Fills its parent. */
export type GlobeViewProps = {
  /** Camera target. When it changes, fly the camera there (flyCameraTo). */
  center: LatLon;
  /** Called once the 3D element is attached and ready. */
  onReady?: () => void;
  /** Called if the maps3d library or element fails; MapShell then falls back to 'local'. */
  onError?: (err: unknown) => void;
  className?: string;
};

/** Place search box. Tries PlaceAutocompleteElement, falls back to GET /api/geocode?q= */
export type SearchBarProps = {
  onSelect: (place: PlaceSelection) => void;
  placeholder?: string;
  className?: string;
};

/** Shape of GET /api/geocode?q=... (owner: A). */
export type GeocodeResult = { lat: number; lon: number; label: string; country?: string };
export type GeocodeResponse = { results: GeocodeResult[] };

/** Heatmap palette, worst → best. Proposal; tune by eye. */ // tunable
export const HEAT_COLORS: [number, number, number][] = [
  [10, 22, 74], // deep navy — lowest visibility
  [30, 58, 138],
  [37, 99, 235],
  [14, 165, 233],
  [34, 197, 94],
  [134, 239, 172], // light green — best
];
