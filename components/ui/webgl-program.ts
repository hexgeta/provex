import { MaterialUniforms } from './webgl-utils';

export interface Program {
  program: WebGLProgram;
  uniforms: MaterialUniforms;
}

export class ProgramManager {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private programs: Map<string, Program>;

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.gl = gl;
    this.programs = new Map();
  }

  createShader(type: number, source: string): WebGLShader | null {
    try {
      const shader = this.gl.createShader(type);
      if (!shader) return null;

      this.gl.shaderSource(shader, source);
      this.gl.compileShader(shader);

      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        this.gl.deleteShader(shader);
        return null;
      }

      return shader;
    } catch (error) {
      return null;
    }
  }

  createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    try {
      const program = this.gl.createProgram();
      if (!program) return null;

      this.gl.attachShader(program, vertexShader);
      this.gl.attachShader(program, fragmentShader);
      this.gl.linkProgram(program);

      if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        this.gl.deleteProgram(program);
        return null;
      }

      return program;
    } catch (error) {
      return null;
    }
  }

  getUniforms(program: WebGLProgram): MaterialUniforms {
    const uniforms: { [key: string]: WebGLUniformLocation } = {};
    const uniformCount = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);
    
    for (let i = 0; i < uniformCount; i++) {
      const uniformInfo = this.gl.getActiveUniform(program, i);
      if (uniformInfo) {
        const uniformName = uniformInfo.name;
        const location = this.gl.getUniformLocation(program, uniformName);
        if (location) {
          uniforms[uniformName] = location;
        }
      }
    }
    
    return uniforms;
  }

  createShaderProgram(name: string, vertexSource: string, fragmentSource: string): Program | null {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) {
      return null;
    }

    const program = this.createProgram(vertexShader, fragmentShader);
    if (!program) {
      return null;
    }

    const uniforms = this.getUniforms(program);
    const programObj = { program, uniforms };
    this.programs.set(name, programObj);

    return programObj;
  }

  getProgram(name: string): Program | undefined {
    return this.programs.get(name);
  }

  useProgram(name: string): void {
    const program = this.programs.get(name);
    if (program) {
      this.gl.useProgram(program.program);
    }
  }

  cleanup(): void {
    this.programs.forEach(({ program }) => {
      this.gl.deleteProgram(program);
    });
    this.programs.clear();
  }
} 