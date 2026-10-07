// Cosas de pasos anteriores
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");
if (!gl) {
    throw new Error("WebGL2 no está disponible en este navegador.");
}
gl.viewport(0,0,canvas.width,canvas.height);
gl.clearColor(0.0, 0.0, 0.0, 1.0);

// Definimos los vertices de nuestra figura (le triangule)
const vertices = new Float32Array([
    0.0,  0.35,   
    -0.35, -0.35, 
    0.35, -0.35   
]);


const vertexBuffer = gl.createBuffer();                     // Definimos el buffer de vertices
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);               // Indicamos que cuando trabajemos con ARRAY_BUFFER trabajamos tambien con vertex buffer
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);   // Copiamos los datos de los vertices

// Shaders
const vertexShaderSource = `#version 300 es
// Posición del vértice enviada desde JavaScript.
in vec2 aPosition;

// Matriz de transformación enviada desde JavaScript.
uniform mat3 uModelMatrix;
    // Que es un uniform: Variable que tiene el mismo valor para cada vertice

void main() {

    // Convierte el vértice (x,y) en coordenadas homogéneas (x,y,1).
    vec3 posicionLocal = vec3(aPosition, 1.0);

    // Multiplica la matriz por el vértice para obtener
    // la posición transformada.
    vec3 posicionTransformada = uModelMatrix * posicionLocal;

    // Envía la posición final al pipeline gráfico.
    gl_Position = vec4(
        posicionTransformada.xy,
        0.0,
        1.0
    );
}
`;

const fragmentShaderSource = `#version 300 es

// Define precisión alta para cálculos con float.
precision highp float;

// Variable donde se escribirá el color final.
out vec4 outColor;

void main() {

    // Color amarillo-anaranjado completamente opaco.
    outColor = vec4(1.0, 0.75, 0.1, 1.0);
}
`;



function crearShader(gl, tipo, codigoFuente) {
    const shader = gl.createShader(tipo);
    gl.shaderSource(shader, codigoFuente);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error("Error al compilar shader:\n" + error);
    }
    return shader;
}

const vertexShader = crearShader(gl,gl.VERTEX_SHADER,vertexShaderSource);
const fragmentShader = crearShader(gl,gl.FRAGMENT_SHADER,fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(
        "Error al enlazar programa:\n" + gl.getProgramInfoLog(program)
    );
}

const vao = gl.createVertexArray();

gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
const positionLocation = gl.getAttribLocation(program, "aPosition");
gl.enableVertexAttribArray(positionLocation);

gl.vertexAttribPointer(
    positionLocation, 
    2,                
    gl.FLOAT,         
    false,            
    0,                
    0                 
);

function matrizIdentidad() {
    return new Float32Array([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ]);
}

function matrizTraslacion(tx, ty) {
    return new Float32Array([
        1,  0, 0,
        0,  1, 0,
        tx, ty, 1
    ]);
}

function matrizRotacion(anguloRadianes) {
    const c = Math.cos(anguloRadianes);
    const s = Math.sin(anguloRadianes);

    return new Float32Array([
         c, s, 0,
        -s, c, 0,
         0, 0, 1
    ]);
}

function matrizEscala(sx, sy) {
    return new Float32Array([
        sx, 0,  0,
        0,  sy, 0,
        0,  0,  1
    ]);
}

function multiplicarMat3(a, b) {
    const resultado = new Float32Array(9);
    for (let columna = 0; columna < 3; columna++) {
        for (let fila = 0; fila < 3; fila++) {
            let suma = 0;
            for (let k = 0; k < 3; k++) {
                suma +=
                    a[k * 3 + fila] *
                    b[columna * 3 + k];
            }
            resultado[columna * 3 + fila] = suma;
        }
    }
    return resultado;
}

const tx = 0.30;
const ty = 0.10;
const anguloGrados = 35;
const anguloRadianes = anguloGrados * Math.PI / 180;
const sx = 1.20;
const sy = 0.80;

const T = matrizTraslacion(tx, ty);
const R = matrizRotacion(anguloRadianes);
const S = matrizEscala(sx, sy);
const RS = multiplicarMat3(R, S);
const modelMatrix = multiplicarMat3(T, RS);

gl.useProgram(program);

const modelMatrixLocation = gl.getUniformLocation(program, "uModelMatrix");
    
gl.uniformMatrix3fv(
    modelMatrixLocation,
    false,
    modelMatrix
);

gl.clear(gl.COLOR_BUFFER_BIT);

gl.bindVertexArray(vao);

gl.drawArrays(
    gl.TRIANGLES,
    0,
    3
);