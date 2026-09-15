// ------------------------------------------------------------
// PASO 6 - CÁMARA Y PROYECCIÓN PERSPECTIVA
// Model + View + Projection
// ------------------------------------------------------------

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL2 no está disponible en este navegador.");
}

gl.viewport(0, 0, canvas.width, canvas.height);

gl.clearColor(0.0, 0.0, 0.0, 1.0);

gl.enable(gl.DEPTH_TEST);

// ------------------------------------------------------------
// 1. GEOMETRÍA DEL CUBO
// x, y, z, r, g, b
// ------------------------------------------------------------

const vertices = new Float32Array([
    -0.5, -0.5,  0.5,   1.0, 0.2, 0.2,
     0.5, -0.5,  0.5,   0.2, 1.0, 0.2,
     0.5,  0.5,  0.5,   0.2, 0.4, 1.0,
    -0.5,  0.5,  0.5,   1.0, 1.0, 0.2,

    -0.5, -0.5, -0.5,   1.0, 0.2, 1.0,
     0.5, -0.5, -0.5,   0.2, 1.0, 1.0,
     0.5,  0.5, -0.5,   1.0, 0.6, 0.2,
    -0.5,  0.5, -0.5,   0.7, 0.7, 0.7
]);

const indices = new Uint16Array([
    0, 1, 2,   0, 2, 3,
    1, 5, 6,   1, 6, 2,
    5, 4, 7,   5, 7, 6,
    4, 0, 3,   4, 3, 7,
    3, 2, 6,   3, 6, 7,
    4, 5, 1,   4, 1, 0
]);

// ------------------------------------------------------------
// 2. SHADERS
// ------------------------------------------------------------

const vertexShaderSource = `#version 300 es

in vec3 aPosition;
in vec3 aColor;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

out vec3 vColor;

void main() {

    gl_Position =
        uProjectionMatrix *
        uViewMatrix *
        uModelMatrix *
        vec4(aPosition, 1.0);

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
// 3. COMPILACIÓN DE SHADERS
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

const vertexShader = crearShader(
    gl,
    gl.VERTEX_SHADER,
    vertexShaderSource
);

const fragmentShader = crearShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
);

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

gl.useProgram(program);

// ------------------------------------------------------------
// 4. VAO Y BUFFERS
// ------------------------------------------------------------

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const vertexBuffer = gl.createBuffer();

gl.bindBuffer(
    gl.ARRAY_BUFFER,
    vertexBuffer
);

gl.bufferData(
    gl.ARRAY_BUFFER,
    vertices,
    gl.STATIC_DRAW
);

const stride =
    6 * Float32Array.BYTES_PER_ELEMENT;

// Posición
const positionLocation =
    gl.getAttribLocation(program, "aPosition");

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
const colorLocation =
    gl.getAttribLocation(program, "aColor");

gl.enableVertexAttribArray(colorLocation);

gl.vertexAttribPointer(
    colorLocation,
    3,
    gl.FLOAT,
    false,
    stride,
    3 * Float32Array.BYTES_PER_ELEMENT
);

// Índices
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
// 5. FUNCIONES VECTORIALES
// ------------------------------------------------------------

function restarVec3(a, b) {
    return [
        a[0] - b[0],
        a[1] - b[1],
        a[2] - b[2]
    ];
}

function longitudVec3(v) {
    return Math.hypot(v[0], v[1], v[2]);
}

function normalizarVec3(v) {

    const longitud = longitudVec3(v);

    return [
        v[0] / longitud,
        v[1] / longitud,
        v[2] / longitud
    ];
}

function productoCruz(a, b) {

    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

// ------------------------------------------------------------
// 6. MATRICES 4x4
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

function multiplicarMat4(a, b) {

    const resultado =
        new Float32Array(16);

    for (
        let columna = 0;
        columna < 4;
        columna++
    ) {
        for (
            let fila = 0;
            fila < 4;
            fila++
        ) {
            let suma = 0;

            for (let k = 0; k < 4; k++) {

                suma +=
                    a[k * 4 + fila] *
                    b[columna * 4 + k];
            }

            resultado[
                columna * 4 + fila
            ] = suma;
        }
    }

    return resultado;
}

// ------------------------------------------------------------
// 7. MATRIZ DE PERSPECTIVA
// ------------------------------------------------------------

function matrizPerspectiva(
    fovRadianes,
    aspect,
    near,
    far
) {

    const f =
        1.0 / Math.tan(fovRadianes / 2);

    const nf =
        1 / (near - far);

    return new Float32Array([
        f / aspect, 0, 0, 0,

        0, f, 0, 0,

        0, 0,
        (far + near) * nf,
        -1,

        0, 0,
        (2 * far * near) * nf,
        0
    ]);
}

// ------------------------------------------------------------
// 8. MATRIZ LOOK AT
// ------------------------------------------------------------

function matrizLookAt(
    eye,
    target,
    up
) {

    // Eje Z de la cámara:
    // desde target hacia eye.
    const zAxis =
        normalizarVec3(
            restarVec3(eye, target)
        );

    // Eje X de la cámara.
    const xAxis =
        normalizarVec3(
            productoCruz(up, zAxis)
        );

    // Eje Y de la cámara.
    const yAxis =
        productoCruz(
            zAxis,
            xAxis
        );

    return new Float32Array([
        xAxis[0],
        yAxis[0],
        zAxis[0],
        0,

        xAxis[1],
        yAxis[1],
        zAxis[1],
        0,

        xAxis[2],
        yAxis[2],
        zAxis[2],
        0,

        -(
            xAxis[0] * eye[0] +
            xAxis[1] * eye[1] +
            xAxis[2] * eye[2]
        ),

        -(
            yAxis[0] * eye[0] +
            yAxis[1] * eye[1] +
            yAxis[2] * eye[2]
        ),

        -(
            zAxis[0] * eye[0] +
            zAxis[1] * eye[1] +
            zAxis[2] * eye[2]
        ),

        1
    ]);
}

// ------------------------------------------------------------
// 9. UBICACIÓN DE UNIFORMS
// ------------------------------------------------------------

const modelMatrixLocation =
    gl.getUniformLocation(
        program,
        "uModelMatrix"
    );

const viewMatrixLocation =
    gl.getUniformLocation(
        program,
        "uViewMatrix"
    );

const projectionMatrixLocation =
    gl.getUniformLocation(
        program,
        "uProjectionMatrix"
    );

// ------------------------------------------------------------
// 10. CONFIGURAR CÁMARA
// ------------------------------------------------------------

const eye = [2.5, 1.8, 4.0];
const target = [0.0, 0.0, 0.0];
const up = [0.0, 1.0, 0.0];

const viewMatrix =
    matrizLookAt(
        eye,
        target,
        up
    );

// ------------------------------------------------------------
// 11. CONFIGURAR PROYECCIÓN
// ------------------------------------------------------------

const fovGrados = 60;

const fovRadianes =
    fovGrados * Math.PI / 180;

const aspect =
    canvas.width / canvas.height;

const near = 0.1;
const far = 100.0;

const projectionMatrix =
    matrizPerspectiva(
        fovRadianes,
        aspect,
        near,
        far
    );

// Enviamos View y Projection una vez,
// porque en este ejemplo no cambian.
gl.uniformMatrix4fv(
    viewMatrixLocation,
    false,
    viewMatrix
);

gl.uniformMatrix4fv(
    projectionMatrixLocation,
    false,
    projectionMatrix
);

// ------------------------------------------------------------
// 12. ANIMACIÓN
// ------------------------------------------------------------

let anguloX = 0;
let anguloY = 0;

let tiempoAnterior = 0;

const velocidadX = 0.5;
const velocidadY = 0.8;

function render(tiempoActual) {

    const tiempoSegundos =
        tiempoActual * 0.001;

    const deltaTime =
        tiempoSegundos -
        tiempoAnterior;

    tiempoAnterior =
        tiempoSegundos;

    anguloX +=
        velocidadX * deltaTime;

    anguloY +=
        velocidadY * deltaTime;

    // --------------------------------------------------------
    // MODEL
    // --------------------------------------------------------

    const Rx =
        matrizRotacionX(anguloX);

    const Ry =
        matrizRotacionY(anguloY);

    const rotacion =
        multiplicarMat4(
            Ry,
            Rx
        );

    // El objeto permanece en el origen del mundo.
    const T =
        matrizTraslacion4(
            0.0,
            0.0,
            0.0
        );

    const modelMatrix =
        multiplicarMat4(
            T,
            rotacion
        );

    gl.uniformMatrix4fv(
        modelMatrixLocation,
        false,
        modelMatrix
    );

    // --------------------------------------------------------
    // LIMPIAR FRAMEBUFFERS
    // --------------------------------------------------------

    gl.clear(
        gl.COLOR_BUFFER_BIT |
        gl.DEPTH_BUFFER_BIT
    );

    // --------------------------------------------------------
    // DIBUJAR
    // --------------------------------------------------------

    gl.bindVertexArray(vao);

    gl.drawElements(
        gl.TRIANGLES,
        indices.length,
        gl.UNSIGNED_SHORT,
        0
    );

    requestAnimationFrame(render);
}

requestAnimationFrame(render);
