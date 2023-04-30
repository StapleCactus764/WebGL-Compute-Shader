# WebGL Compute Shaders
A library for running compute shaders on the web with WebGL.

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
Sets up inputs and tells WebGL how to access them.

**`.clearInputs()`**  
Removes all inputs.

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
