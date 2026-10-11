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

/**
 * Heatmap palette, worst → best, evenly spaced over score 0–100. [r, g, b, alpha 0–1].
 * Warm on purpose: the dark map would swallow blue/green. Low scores fade out so bad
 * areas show the plain map. Proposal (user asked for red/orange/yellow); tune by eye.
 */ // tunable
export const HEAT_COLORS: [number, number, number, number][] = [
  [153, 27, 27, 0], // transparent — nothing to see here
  [153, 27, 27, 0.6], // dark red
  [234, 88, 12, 0.78], // orange
  [250, 204, 21, 0.92], // yellow — best
];
