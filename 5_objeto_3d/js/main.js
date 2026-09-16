// ------------------------------------------------------------
// PASO 5 - PRIMER OBJETO 3D
// Matrices 4x4 + eje Z + indices + profundidad
// ------------------------------------------------------------

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");
if (!gl) {
    throw new Error("WebGL2 no está disponible en este navegador.");
}
gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.0, 0.0, 0.0, 1.0);

gl.enable(gl.DEPTH_TEST); // Activamos el test de profundidad


// Geometria del cubo
const vertices = new Float32Array([
    // x,     y,     z,      r,   g,   b
    -0.35, -0.35,  0.35,    1.0, 0.2, 0.2, // 0
     0.35, -0.35,  0.35,    0.2, 1.0, 0.2, // 1
     0.35,  0.35,  0.35,    0.2, 0.4, 1.0, // 2
    -0.35,  0.35,  0.35,    1.0, 1.0, 0.2, // 3

    -0.35, -0.35, -0.35,    1.0, 0.2, 1.0, // 4
     0.35, -0.35, -0.35,    0.2, 1.0, 1.0, // 5
     0.35,  0.35, -0.35,    1.0, 0.6, 0.2, // 6
    -0.35,  0.35, -0.35,    0.7, 0.7, 0.7  // 7
]);

// Cada cara del cubo esta formada por dos triangulos
const indices = new Uint16Array([
    // Frente
    0, 1, 2,
    0, 2, 3,
    // Derecha
    1, 5, 6,
    1, 6, 2,
    // Atrás
    5, 4, 7,
    5, 7, 6,
    // Izquierda
    4, 0, 3,
    4, 3, 7,
    // Arriba
    3, 2, 6,
    3, 6, 7,
    // Abajo
    4, 5, 1,
    4, 1, 0
]);

// ------------------------------------------------------------
// 2. SHADERS
// ------------------------------------------------------------

const vertexShaderSource = `#version 300 es
in vec3 aPosition;
in vec3 aColor;

uniform mat4 uModelMatrix;

out vec3 vColor;

void main() {
    gl_Position = uModelMatrix * vec4(aPosition, 1.0);
    vColor = aColor;
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec3 vColor;

out vec4 outColor;

void main() {
    outColor = vec4(vColor, 1.0);
}
`;

// ------------------------------------------------------------
// 3. FUNCIÓN PARA COMPILAR SHADERS
// ------------------------------------------------------------

function crearShader(gl, tipo, codigoFuente) {
    const shader = gl.createShader(tipo);
    gl.shaderSource(shader, codigoFuente);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(
            "Error al compilar shader:\n" + error
        );
    }
    return shader;
}

// ------------------------------------------------------------
// 4. COMPILAR Y ENLAZAR PROGRAMA
// ------------------------------------------------------------

const vertexShader = crearShader(gl,gl.VERTEX_SHADER,vertexShaderSource);
const fragmentShader = crearShader(gl,gl.FRAGMENT_SHADER,fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(
        "Error al enlazar programa:\n" +
        gl.getProgramInfoLog(program)
    );
}

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const vertexBuffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);


// Cada vértice contiene 6 floats:
// x, y, z, r, g, b
const stride = 6 * Float32Array.BYTES_PER_ELEMENT;

// Posición
const positionLocation = gl.getAttribLocation(program, "aPosition");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(
    positionLocation,
    3,
    gl.FLOAT,
    false,
    stride,
    0
);

// Color
const colorLocation = gl.getAttribLocation(program, "aColor");

gl.enableVertexAttribArray(colorLocation);

gl.vertexAttribPointer(
    colorLocation,
    3,
    gl.FLOAT,
    false,
    stride,
    3 * Float32Array.BYTES_PER_ELEMENT
);

// ------------------------------------------------------------
// 7. BUFFER DE ÍNDICES
// ------------------------------------------------------------

const indexBuffer = gl.createBuffer();

gl.bindBuffer(
    gl.ELEMENT_ARRAY_BUFFER,
    indexBuffer
);

gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    indices,
    gl.STATIC_DRAW
);

// ------------------------------------------------------------
// 8. MATRICES 4x4
//
// Los datos se almacenan en orden de columnas.
// ------------------------------------------------------------

function matrizIdentidad4() {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}

function matrizTraslacion4(tx, ty, tz) {
    return new Float32Array([
        1,  0,  0,  0,
        0,  1,  0,  0,
        0,  0,  1,  0,
        tx, ty, tz, 1
    ]);
}

function matrizEscala4(sx, sy, sz) {
    return new Float32Array([
        sx, 0,  0,  0,
        0,  sy, 0,  0,
        0,  0,  sz, 0,
        0,  0,  0,  1
    ]);
}

function matrizRotacionX(angulo) {
    const c = Math.cos(angulo);
    const s = Math.sin(angulo);
    return new Float32Array([
        1, 0,  0, 0,
        0, c,  s, 0,
        0, -s, c, 0,
        0, 0,  0, 1
    ]);
}

function matrizRotacionY(angulo) {
    const c = Math.cos(angulo);
    const s = Math.sin(angulo);

    return new Float32Array([
         c, 0, -s, 0,
         0, 1,  0, 0,
         s, 0,  c, 0,
         0, 0,  0, 1
    ]);
}

function matrizRotacionZ(angulo) {

    const c = Math.cos(angulo);
    const s = Math.sin(angulo);

    return new Float32Array([
         c, s, 0, 0,
        -s, c, 0, 0,
         0, 0, 1, 0,
         0, 0, 0, 1
    ]);
}

function multiplicarMat4(a, b) {

    const resultado = new Float32Array(16);

    for (let columna = 0; columna < 4; columna++) {

        for (let fila = 0; fila < 4; fila++) {

            let suma = 0;

            for (let k = 0; k < 4; k++) {

                suma +=
                    a[k * 4 + fila] *
                    b[columna * 4 + k];
            }

            resultado[columna * 4 + fila] = suma;
        }
    }

    return resultado;
}

// ------------------------------------------------------------
// 9. UBICACIÓN DEL UNIFORM
// ------------------------------------------------------------

gl.useProgram(program);

const modelMatrixLocation =
    gl.getUniformLocation(
        program,
        "uModelMatrix"
    );

// ------------------------------------------------------------
// 10. ANIMACIÓN
// ------------------------------------------------------------

let anguloX = 0;
let anguloY = 0;

let tiempoAnterior = 0;

// Velocidad angular en radianes por segundo.
const velocidadX = 0.7;
const velocidadY = 1.0;

function render(tiempoActual) {

    // requestAnimationFrame entrega milisegundos.
    const tiempoSegundos = tiempoActual * 0.001;

    const deltaTime =
        tiempoSegundos - tiempoAnterior;

    tiempoAnterior = tiempoSegundos;

    // Actualizamos los ángulos.
    anguloX += velocidadX * deltaTime;
    anguloY += velocidadY * deltaTime;

    // --------------------------------------------------------
    // 11. CONSTRUIR MATRIZ DE MODELO
    //
    // M = Ry * Rx
    // --------------------------------------------------------

    const Rx = matrizRotacionX(anguloX);
    const Ry = matrizRotacionY(anguloY);

    const modelMatrix =
        multiplicarMat4(Ry, Rx);

    // --------------------------------------------------------
    // 12. ENVIAR MATRIZ A LA GPU
    // --------------------------------------------------------

    gl.uniformMatrix4fv(
        modelMatrixLocation,
        false,
        modelMatrix
    );

    // --------------------------------------------------------
    // 13. LIMPIAR COLOR Y PROFUNDIDAD
    // --------------------------------------------------------

    gl.clear(
        gl.COLOR_BUFFER_BIT |
        gl.DEPTH_BUFFER_BIT
    );

    // --------------------------------------------------------
    // 14. DIBUJAR CUBO
    // --------------------------------------------------------

    gl.bindVertexArray(vao);

    gl.drawElements(
        gl.TRIANGLES,
        indices.length,
        gl.UNSIGNED_SHORT,
        0
    );

    // Solicitar siguiente frame.
    requestAnimationFrame(render);
}

// Iniciar Render Loop.
requestAnimationFrame(render);
