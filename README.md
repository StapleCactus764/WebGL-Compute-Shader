# WebGL Compute Shaders
A library for running compute shaders on the web with WebGL.

JSDelivr link:
https://cdn.jsdelivr.net/gh/staplecactus764/webgl-compute-shader@v1.0.3/main.js

## Main Ideas
**Contexts:**  
A context is the base for a compute shader. All compute shaders that share the same context can directly share information with each other. There is no default context, so a context has to be set before progressing. When a compute shader element (uniform, input, a shader) is created, it is assigned to the current context. No work should be done on that element if the current context is not its own context.

**Compute Shader:**  
A WebGL shader that is designed to do computations on the GPU without rendering to the screen. They take a single fragment shader written in GLSL and multiple inputs. Once run, they write to an output which can be passed to other shaders.

**Inputs:**  
Inputs are the main way of getting a large amount of information in and out of a shader. A shader has to be told that it will use a certain input before that input can be passed to it. Inputs can be passed between shaders without needing to transfer information to the CPU. However, you can also read from an input and pass its data to the CPU.

**Uniforms:**  
Uniforms are like inputs but only represent a single piece of information, like a number or a vector. Shaders also have to be told that they will use a certain uniform before being passed that uniform.

**Rendering to the Canvas:**  
If necessary, a shader can be told to render to the canvas rather than write to an output.

**Limits:**  
This library currently only supports WebGL 1 and uses three extensions: OES_texture_float, OES_texture_float_linear, and WEBGL_color_buffer_float. Some devices do not support these.

## Demo
This demo takes a list of numbers, multiplies them by 2 and then subtracts 3. This would normally take close to 100 lines of vanilla WebGL code. 
```javascript
const cgl = new ComputeShaderContext(); // Creates a new context
ComputeShader.useContext(cgl); // Says to use the new context

// The code for the shader
const shaderSource = `
    precision highp float;

    uniform sampler2D num; // The input for the numbers
    uniform vec2 numDim;

    uniform float offset; // The uniform for the offset

    void main() {
        vec4 val = texture2D(num, gl_FragCoord.xy / numDim); // Gets values from the input
        gl_FragColor = val * 2.0 + offset; // Does a computation and returns the new value
    }
`;

// Creates an array that has a length of 1600 and fills it with integers
const data = new Float32Array(20 * 20 * 4);
for (let i = 0; i < data.length; i ++) data[i] = i;

const input = new ComputeShaderInput('num', data, 20, 20); // Creates an input
const offset = new ComputeShaderUniform('offset', -3, '1f'); // Creates an output that is -3 as a float

const cs = new ComputeShader(shaderSource, 20, 20); // Creates a new shader

// Tells the shader that it will use the input and the offset
cs.addInput(input);
cs.addUniform(offset);

// Runs the shader
cs.use();
cs.initializeInputs();
cs.initializeUniforms();
cs.run();

console.log(cs.output.read()); // Logs the result
```

**Output:** `[-3, -1, 1, 3, 5, 7, 9, 11, 13, ...]`

## Documentation
### `ComputeShader(source, width, height)`
Creates a compute shader. `source` is a string with the GLSL code for the shader. Each shader has a width and a height which represents the size of the output and the number of pixels that the shader will run on.

**`.use(useCanvas)`**  
Makes the context ready for the current shader to be run and innitialize inputs/uniforms. If `useCanvas` is true, then the shader will draw to the canvas rather than to its output.

**`.run()`**  
Runs the shader and writes to the output or to the canvas, depending how it was set.

**`.addInput(input)`**  
Tells the shader that it will use a certain input. `input` is the input to be used.

**`.removeInput(input)`**  
Tells the shader to remove a certain input. `input` is the input to be removed.

**`.initializeInputs()`**  
Sets up inputs and tells WebGL how to access them. It also creates vec2 uniforms that represent the dimensions of the input. Their names follow the format of nameOfInput + 'dim'. So, an input named 'values' would have a dimensions uniform of 'valuesDim'

**`.clearInputs()`**  
Removes all inputs.

**`.addUniform(uniform)`**
Tells the shader that it will use a certain uniform. `uniform` is the uniform to be used.

**`.initializeUniforms()`**  
Sets up uniforms and tells WebGL how to access them.

**`.clearUniforms()`**  
Removes all uniforms.

**`static clear()`**  
Clears all shader's outputs.

**`static swap(input1, input2)`**  
Takes two inputs or outputs and swaps them. `input1` and `input2` are the inputs/outputs to be swapped.

**`static useContext(context)`**  
Sets the current context to `context`.

**`static gl`**  
The underlying WebGL context.

### `ComputeShaderContext(powerPreference)`
Creates a context. It has two properties: `canvas` and `context`. `canvas` is the underlying HTML element that runs it all. `context` is the WebGL context that the shaders run on. `powerPreference`, if set to true, will change the context so it prioritizes performance over battery usage in supporting browsers.

### `ComputeShaderInput(location, data, width, height, type = 'RGBA')`
Creates an input for a shader. `location` is the name that will be used to access it in GLSL. `data` is a Float32Array that corresponds with the width and height of the input. If the type has multiple channels, it has to be of the length width * height * numChannels. `type` is the format used internally and in the GLSL.

**`update(data)`**  
Updates the data of the input.

**`read(result = new Float32Array(this.width * this.height * 4)`**  
Reads the values of the input into `result`. The default value of `result` assumes that the input is in a four channel format, like RGBA.

### `ComputeShaderUniform(location, data, type)`
Creates a uniform for a shader. `location` is the name that will be used to access it in GLSL. `data` is the number or array of numbers that the uniform will hold. `type` is the type of uniform. It correspond with the WebGL uniform formals, but with the 'uniform' prefix cut off. Examples include, but are not limited to: 1f, 2fv, 3f, and 4fv.

**`update(data)`**  
Updates the data that the uniform holds.
