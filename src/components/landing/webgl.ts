// Small WebGL2 helpers for the Earth limb: compile a program, load an image as a mipmapped texture.

export function createProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("WebGL could not create a shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader failed to compile: ${log}`);
    }
    return shader;
  };

  const program = gl.createProgram();
  if (!program) throw new Error("WebGL could not create a program");
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Program failed to link: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

/** Loads `src` into texture unit `unit`: wraps around east-west, clamps at the poles, mipmapped. */
export async function loadTexture(gl: WebGL2RenderingContext, src: string, unit: number): Promise<WebGLTexture> {
  const image = await loadImage(src);
  if (Math.max(image.width, image.height) > gl.getParameter(gl.MAX_TEXTURE_SIZE)) {
    throw new Error(`${src} is larger than this GPU's texture limit`);
  }
  const texture = gl.createTexture();
  if (!texture) throw new Error("WebGL could not create a texture");
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // The coast is seen at a grazing angle; anisotropic filtering keeps it from smearing.
  const anisotropy = gl.getExtension("EXT_texture_filter_anisotropic");
  if (anisotropy) {
    const max = gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number;
    gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
  }
  return texture;
}
