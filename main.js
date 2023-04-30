class ComputeShaderError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ComputeShaderError';
    }
}
class ComputeShader {
    constructor(source, width, height) {
        if (!ComputeShader.#gl) throw new ComputeShaderError(`Attempted to create a compute shader without a WebGL context`);
        if (+width <= 0) throw new ComputeShaderError(`Attempted to create a compute shader without a width`);
        if (+height <= 0) throw new ComputeShaderError(`Attempted to create a compute shader without a height`);

        this.gl = ComputeShader.#gl;
        this.width = width;
        this.height = height;

        this.vertexShader = ComputeShader.createShader(this.gl, this.gl.VERTEX_SHADER, ComputeShader.vertexShader);
        this.fragmentShader = ComputeShader.createShader(this.gl, this.gl.FRAGMENT_SHADER, source);
        this.program = ComputeShader.createProgram(this.gl, this.vertexShader, this.fragmentShader);
        
        this.aPos = this.gl.getAttribLocation(this.program, 'aPos');

        this.posBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.posBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, ComputeShader.positions, this.gl.STATIC_DRAW);
        
        this.gl.vertexAttribPointer(
            this.aPos,
            2,
            this.gl.FLOAT,
            false,
            0,
            0,
        );
        this.gl.enableVertexAttribArray(this.aPos);

        this.textureId = 0; 
        this.ids = [];
        this.inputs = {length: 0};
        this.inputInfo = {length: 0}; // Information that changes between shaders (like id and such)
        this.uniforms = {};
        this.uniformsInfo = {};
        this.attributes = [];
        
        this.output = {
            frameBuffer: this.gl.createFramebuffer(),
            texture: this.gl.createTexture(),
            width: width,
            height: height,
            type: 'RGBA',
        };
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.output.texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.width, this.height, 0, this.gl.RGBA, this.gl.FLOAT, new Float32Array(this.width * this.height * 4));
        
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    };
    use(useCanvas = false) {
        this.gl.useProgram(this.program);

        if (useCanvas) this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.output.frameBuffer);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.output.texture, 0);
        }
        this.gl.viewport(0, 0, this.width, this.height);
    }
    run() {
        for (const i in this.inputs) {
            const input = this.inputs[i];
            if (!input || i === 'length') continue;

            this.gl.activeTexture(this.gl.TEXTURE0 + this.inputInfo[input.locationName].id);
            this.gl.bindTexture(this.gl.TEXTURE_2D, input.texture);
        }

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    }
    read(result = new Float32Array(this.width * this.height * 4)) {
        this.gl.readPixels(0, 0, this.width, this.height, this.gl.RGBA, this.gl.FLOAT, result)
        return result;
    }
    clear() {
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
    
    addInput(input) {
        if (this.inputs[input.locationName]) throw new ComputeShaderError(`The input name '${input.locationName}' is already taken.`);
        if (this.inputs[input.locationName]?.shader) throw new ComputeShaderError(`The input '${input.locationName}' is being used by another shader.`);

        const inputInfo = {};
        this.inputInfo[input.locationName] = inputInfo;
        inputInfo.id = this.ids.length ? this.ids.pop() : this.textureId ++;
        inputInfo.location = this.gl.getUniformLocation(this.program, input.locationName),
        inputInfo.dimensionsLocation = this.gl.getUniformLocation(this.program, input.locationName + 'Dimensions'),

        this.inputs[input.locationName] = input;
        this.inputs.length ++;
    };
    removeInput(input) {
        if (!this.inputs[input.locationName]) console.warn(`The input '${input.locationName}' does not exist.`);

        this.ids.push(input.id);
        input.shader = this.inputInfo[input.locationName].id = this.inputInfo[input.locationName].location = this.inputInfo[input.locationName].dimensionsLocation = null;
        this.inputs[input.locationName] = null;
        this.inputs.length --;
    }
    initializeInputs() {
        for (const i in this.inputs) {
            if (!this.inputs[i] || i === 'length') continue;
            const input = this.inputs[i];
            
            this.gl.uniform1i(this.inputInfo[input.locationName].location, this.inputInfo[input.locationName].id);
            this.gl.uniform2fv(this.inputInfo[input.locationName].dimensionsLocation, [this.inputs[i].width, this.inputs[i].height]);
        }
    };
    clearInputs() {
        for (const i in this.inputs) {
            if (!this.inputs[i] || i === 'length') continue;
            this.removeInput(this.inputs[i]);
        }
        this.inputs = {length: 0};
        this.textureId = 0;
        this.ids.length = 0;
    }
    
    addUniform(uniform) {
        this.uniforms[uniform.locationName] = uniform;
        this.uniformsInfo[uniform.locationName] = this.gl.getUniformLocation(this.program, uniform.locationName);
    }
    initializeUniforms() {
        for (let i in this.uniforms) {
            this.gl['uniform' + this.uniforms[i].type](this.uniformsInfo[i], this.uniforms[i].data);
        }
    }
    clearUniforms() {
        this.uniforms.length = 0;
    }
    
    testInformation(action) {
        if (!this.gl) throw new ComputeShaderError(`Attempted to ${action} without a WebGL context`);
        if (!this.program) throw new ComputeShaderError(`Attempted to ${action} without a program`);
    }

    static vertexShader = `
        attribute vec2 aPos;
        void main() {
            gl_Position = vec4(aPos, 0, 1);
        }
    `;
    static positions = new Float32Array([
        -1, -1,
        3, -1,
        -1, 3,
    ]);
    static createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new ComputeShaderError('An error occured in a shader: ' + gl.getShaderInfoLog(shader));
        }

        return shader;
    }
    static createProgram(gl, vs, fs) {
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new ComputeShaderError('An error occured in a program: ' + gl.getProgramInfoLog(program));
        }

        return program;
    }
    
    static createInput = (location, data, width, height, type = 'RGBA') => {
        if (location === 'length') throw new ComputeShaderError(`The input name 'length' is a reserved name.`);

        const tex = ComputeShader.#gl.createTexture();
        ComputeShader.#gl.bindTexture(ComputeShader.#gl.TEXTURE_2D, tex);
        ComputeShader.#gl.texImage2D(ComputeShader.#gl.TEXTURE_2D, 0, ComputeShader.#gl[type], width, height, 0, ComputeShader.#gl[type], ComputeShader.#gl.FLOAT, data);
        
        ComputeShader.#gl.texParameteri(ComputeShader.#gl.TEXTURE_2D, ComputeShader.#gl.TEXTURE_MIN_FILTER, ComputeShader.#gl.NEAREST);
        ComputeShader.#gl.texParameteri(ComputeShader.#gl.TEXTURE_2D, ComputeShader.#gl.TEXTURE_MAG_FILTER, ComputeShader.#gl.NEAREST);
        ComputeShader.#gl.texParameteri(ComputeShader.#gl.TEXTURE_2D, ComputeShader.#gl.TEXTURE_WRAP_S, ComputeShader.#gl.CLAMP_TO_EDGE);
        ComputeShader.#gl.texParameteri(ComputeShader.#gl.TEXTURE_2D, ComputeShader.#gl.TEXTURE_WRAP_T, ComputeShader.#gl.CLAMP_TO_EDGE);
        
        const input = {
            id: null,
            texture: tex,
            type: type,
            locationName: location,
            location: null,
            dimensionsLocation: null,
            width: width,
            height: height,
            frameBuffer: ComputeShader.#gl.createFramebuffer(),
        };
        ComputeShader.#gl.bindFramebuffer(ComputeShader.#gl.FRAMEBUFFER, input.frameBuffer);
        ComputeShader.#gl.framebufferTexture2D(ComputeShader.#gl.FRAMEBUFFER, ComputeShader.#gl.COLOR_ATTACHMENT0, ComputeShader.#gl.TEXTURE_2D, input.texture, 0);
        ComputeShader.#gl.viewport(0, 0, width, height);

        return input;
    };
    static updateInput(input, data) {
        ComputeShader.#gl.bindTexture(ComputeShader.#gl.TEXTURE_2D, input.texture);
        ComputeShader.#gl.texImage2D(ComputeShader.#gl.TEXTURE_2D, 0, ComputeShader.#gl[input.type], input.width, input.height, 0, ComputeShader.#gl[input.type], ComputeShader.#gl.FLOAT, data);
    }
    static createUniform(location, type, data) {
        const uniform = {
            locationName: location,
            type: type,
            data: data,
        };

        return uniform;
    }
    static updateUniform(uniform, data) {
        uniform.data = data;
    }
    static readInput(input, result = new Float32Array(input.width * input.height * 4)) {
        ComputeShader.#gl.bindFramebuffer(ComputeShader.#gl.FRAMEBUFFER, input.frameBuffer);
        ComputeShader.#gl.readPixels(0, 0, input.width, input.height, ComputeShader.#gl.RGBA, ComputeShader.#gl.FLOAT, result);
        return result;
    }
    static swapTextures(input, input2) {
        if (!input || !input2) throw new ComputeShaderError('swapTextures requires two inputs.');

        const tempTex = input2.texture,
            tempFB = input2.frameBuffer;
        input2.texture = input.texture;
        input2.frameBuffer = input.frameBuffer;
        input.texture = tempTex;
        input.frameBuffer = tempFB;
    }

    static createContext = () => {
        const canvas = document.createElement('canvas', {powerPreference: 'high-performance'});
        return [canvas, canvas.getContext('webgl')];
    };
    static useContext = gl => {
        if (!gl.getExtension('OES_texture_float')) throw new ComputeShaderError(`Cannot get extention 'OES_texture_float'`);
        if (!gl.getExtension("OES_texture_float_linear")) throw new ComputeShaderError(`Cannot get extention 'OES_texture_float_linear'`);
        if (!gl.getExtension('WEBGL_color_buffer_float')) throw new ComputeShaderError(`Cannot get extention 'WEBGL_color_buffer_float'. Most smartphones do not support this, try switching to another device?`);
        
        ComputeShader.#gl = gl;
    }
    static #gl = null;
}
