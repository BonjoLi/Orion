// GLSL for the landing page's Earth limb. A full-screen triangle; the fragment shader works out
// which point of a sphere each pixel sees, then lights it. All the look numbers below (cloud
// threshold, haze strength, glint width, twilight width) are art direction, tuned by eye.

export const EARTH_VERT = `#version 300 es
void main() {
  // one triangle that covers the whole canvas, generated from the vertex index (no buffers)
  vec2 pos = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}`;

export const EARTH_FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;

uniform vec2 uRes;        // canvas size, device px
uniform vec2 uCenter;     // sphere centre, device px, measured from the canvas top-left
uniform float uRadius;    // sphere radius, device px
uniform float uLon;       // longitude facing the viewer, radians
uniform float uLat;       // latitude facing the viewer, radians (negative: we look up at the north from the south)
uniform float uCloudLon;  // clouds drift a little faster than the ground
uniform vec3 uSun;        // direction to the sun, view space (x right, y up, z toward the viewer)
uniform float uTime;
uniform sampler2D uDayTex;
uniform sampler2D uNightTex;
out vec4 outColor;

const float PI = 3.14159265;
const float ATMOS = 0.016;   // atmosphere thickness as a fraction of the radius (about 100 km of 6371 km)
const vec3 RAYLEIGH = vec3(0.26, 0.52, 1.0);
const vec3 TWILIGHT = vec3(1.0, 0.45, 0.16);
const vec3 SUN_COLOR = vec3(1.0, 0.95, 0.86) * 1.35;

mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return s;
}

// Equirectangular lookup. atan() jumps at the date line, which would make the mip level
// spike into a visible seam, so the derivatives come from whichever u is continuous.
vec4 sampleEq(sampler2D t, vec3 n) {
  vec2 uv = vec2(atan(n.x, n.z) / (2.0 * PI) + 0.5, 0.5 - asin(clamp(n.y, -1.0, 1.0)) / PI);
  float u2 = fract(uv.x + 0.5) - 0.5;
  vec2 gx = abs(dFdx(uv.x)) < abs(dFdx(u2)) ? dFdx(uv) : vec2(dFdx(u2), dFdx(uv.y));
  vec2 gy = abs(dFdy(uv.x)) < abs(dFdy(u2)) ? dFdy(uv) : vec2(dFdy(u2), dFdy(uv.y));
  return textureGrad(t, uv, gx, gy);
}

vec3 toDisplay(vec3 linear) { return pow(1.0 - exp(-linear * 1.25), vec3(1.0 / 2.2)); }

vec3 hazeColor(float ndl) {
  float sunFace = smoothstep(-0.30, 0.55, ndl);
  float twilight = exp(-pow(ndl / 0.16, 2.0));
  return RAYLEIGH * (0.05 + 1.15 * sunFace) + TWILIGHT * twilight * 0.45;
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = (frag - uCenter) / uRadius;
  float r = length(p);
  float nz = sqrt(max(0.0, 1.0 - r * r));
  vec3 nv = vec3(p.x, -p.y, nz);   // surface normal as the viewer sees it

  // ---- the surface -------------------------------------------------------------------
  vec3 nw = rotY(uLon) * rotX(-uLat) * nv;   // the same point, in the planet's own frame
  vec3 dayC = sampleEq(uDayTex, nw).rgb;
  vec3 nightC = sampleEq(uNightTex, nw).rgb;
  float ndl = dot(nv, uSun);
  float wrap = smoothstep(-0.08, 0.30, ndl);   // soft terminator, not a hard cut
  float diff = max(ndl, 0.0);

  float lum = dot(dayC, vec3(0.299, 0.587, 0.114));
  float ocean = smoothstep(0.03, 0.20, dayC.b - dayC.r) * (1.0 - smoothstep(0.4, 0.7, lum));
  vec3 albedo = pow(dayC, vec3(2.2));
  vec3 landAlbedo = albedo * 1.7;   // the source map is muted; lift the land so it reads in sunlight
  landAlbedo = mix(vec3(dot(landAlbedo, vec3(0.333))), landAlbedo, 1.25);   // and a little more colour
  albedo = mix(landAlbedo, albedo * 2.2 + vec3(0.006, 0.02, 0.05), ocean);   // the source map's seas are nearly black

  vec3 ambient = vec3(0.012, 0.022, 0.05);
  vec3 lit = albedo * (ambient + SUN_COLOR * wrap * (0.25 + 0.75 * diff));

  // clouds: noise on a sphere, plus a little extra cover along the mid-latitude storm tracks
  vec3 nc = rotY(uCloudLon) * rotX(-uLat) * nv;
  float belt = exp(-pow((abs(asin(clamp(nc.y, -1.0, 1.0))) - 0.9) / 0.28, 2.0)) * 0.14;
  float cloud = smoothstep(0.54, 0.78, fbm(nc * 2.6 + vec3(0.0, 0.0, uTime * 0.002)) + belt);
  vec3 cloudCol = vec3(0.92, 0.95, 1.0) * (ambient * 2.0 + SUN_COLOR * wrap * (0.30 + 0.70 * diff));
  lit = mix(lit, cloudCol, cloud * 0.85);

  // city lights, only on the dark side and dimmed under cloud
  float darkSide = smoothstep(0.08, -0.12, ndl);
  float lampLum = max(max(nightC.r, nightC.g) - 0.06, 0.0);
  lit += vec3(1.0, 0.70, 0.36) * pow(lampLum * 2.2, 1.5) * 0.85 * darkSide * (1.0 - cloud * 0.75);

  // sunlight on the sea: a soft, narrow glint rather than a mirror
  float spec = pow(max(reflect(-uSun, nv).z, 0.0), 90.0);
  lit += SUN_COLOR * spec * ocean * 0.5 * wrap * (1.0 - cloud);

  // haze thickens toward the limb, bluer in daylight, with an orange band where day meets night
  float fres = pow(1.0 - nz, 2.4);
  vec3 inside = toDisplay(mix(lit, hazeColor(ndl), clamp(fres * 0.5, 0.0, 1.0)));

  // ---- the atmosphere above the limb ---------------------------------------------------
  vec3 limbN = normalize(vec3(p.x, -p.y, 0.0));
  float ndlL = dot(limbN, uSun);
  float h = max(r - 1.0, 0.0) / ATMOS;
  float sunFaceL = smoothstep(-0.30, 0.55, ndlL);
  float aOut = exp(-h * 2.4) * (0.35 + 0.65 * clamp(sunFaceL * 1.2 + 0.15, 0.0, 1.0));
  vec4 outside = vec4(toDisplay(hazeColor(ndlL)) * aOut, aOut);

  float cover = 1.0 - smoothstep(1.0 - 1.5 / uRadius, 1.0 + 1.5 / uRadius, r);   // anti-aliased edge
  vec4 color = mix(outside, vec4(inside, 1.0), cover);
  color += (hash(vec3(frag, 1.0)) - 0.5) / 255.0 * color.a;   // dither: dark gradients would band
  outColor = color;
}`;
