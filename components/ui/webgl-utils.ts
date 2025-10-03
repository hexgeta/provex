export interface MaterialUniforms {
  [key: string]: WebGLUniformLocation;
}

export interface WebGLContext {
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  ext: {
    formatRGBA: any;
    formatRG: any;
    formatR: any;
    halfFloatTexType: any;
    supportLinearFiltering: any;
  };
}

export function initWebGL(canvas: HTMLCanvasElement): WebGLContext | null {
  const params = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
  };

  try {
    const gl2Context = canvas.getContext("webgl2", params) as WebGL2RenderingContext | null;
    const isWebGL2 = !!gl2Context;

    let gl: WebGLRenderingContext | WebGL2RenderingContext;

    if (isWebGL2 && gl2Context) {
      gl = gl2Context;
    } else {
      const gl1Context = (canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params)) as WebGLRenderingContext | null;
      if (!gl1Context) {
        throw new Error('WebGL not supported');
      }
      gl = gl1Context;
    }

    let halfFloat;
    let supportLinearFiltering;
    
    if (isWebGL2) {
      (gl as WebGL2RenderingContext).getExtension("EXT_color_buffer_float");
      supportLinearFiltering = gl.getExtension("OES_texture_float_linear");
    } else {
      halfFloat = gl.getExtension("OES_texture_half_float");
      supportLinearFiltering = gl.getExtension("OES_texture_half_float_linear");
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const halfFloatTexType = isWebGL2
      ? (gl as WebGL2RenderingContext).HALF_FLOAT
      : halfFloat?.HALF_FLOAT_OES;

    return {
      gl,
      ext: {
        formatRGBA: null,
        formatRG: null,
        formatR: null,
        halfFloatTexType,
        supportLinearFiltering: !!supportLinearFiltering,
      },
    };
  } catch (error) {
    return null;
  }
}

export function createShader(gl: WebGLRenderingContext | WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  try {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  } catch (error) {
    return null;
  }
}

export function createProgram(gl: WebGLRenderingContext | WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
  try {
    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  } catch (error) {
    return null;
  }
}

export function getUniforms(gl: WebGLRenderingContext | WebGL2RenderingContext, program: WebGLProgram): MaterialUniforms {
  const uniforms: { [key: string]: WebGLUniformLocation } = {};
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  
  for (let i = 0; i < uniformCount; i++) {
    const uniformInfo = gl.getActiveUniform(program, i);
    if (uniformInfo) {
      const uniformName = uniformInfo.name;
      const location = gl.getUniformLocation(program, uniformName);
      if (location) {
        uniforms[uniformName] = location;
      }
    }
  }
  
  return uniforms;
}

export function createTexture(gl: WebGLRenderingContext | WebGL2RenderingContext, internalFormat: number, format: number, type: number, width: number, height: number): WebGLTexture | null {
  try {
    const texture = gl.createTexture();
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);
    
    return texture;
  } catch (error) {
    return null;
  }
}

export function createFramebuffer(gl: WebGLRenderingContext | WebGL2RenderingContext, texture: WebGLTexture): WebGLFramebuffer | null {
  try {
    const fbo = gl.createFramebuffer();
    if (!fbo) return null;

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    
    return fbo;
  } catch (error) {
    return null;
  }
} 