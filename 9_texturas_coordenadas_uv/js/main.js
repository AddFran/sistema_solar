// ------------------------------------------------------------
// PASO 9 - TEXTURAS Y COORDENADAS UV
// Esfera iluminada + textura procedural
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
// 1. GENERAR ESFERA
// Cada vértice contiene:
// x, y, z, nx, ny, nz, u, v
// ------------------------------------------------------------

function crearEsfera(radio, segmentosLatitud, segmentosLongitud) {

    const vertices = [];
    const indices = [];

    for (let latitud = 0; latitud <= segmentosLatitud; latitud++) {

        const v = latitud / segmentosLatitud;
        const phi = v * Math.PI;

        for (let longitud = 0; longitud <= segmentosLongitud; longitud++) {

            const u = longitud / segmentosLongitud;
            const theta = u * Math.PI * 2;

            const nx = Math.sin(phi) * Math.cos(theta);
            const ny = Math.cos(phi);
            const nz = Math.sin(phi) * Math.sin(theta);

            const x = radio * nx;
            const y = radio * ny;
            const z = radio * nz;

            // Posición
            vertices.push(x, y, z);

            // Normal
            vertices.push(nx, ny, nz);

            // Coordenadas UV
            // Invertimos V para que la textura se lea de arriba hacia abajo.
            vertices.push(u, 1.0 - v);
        }
    }

    const columnas = segmentosLongitud + 1;

    for (let latitud = 0; latitud < segmentosLatitud; latitud++) {

        for (let longitud = 0; longitud < segmentosLongitud; longitud++) {

            const actual = latitud * columnas + longitud;
            const siguiente = actual + columnas;

            indices.push(actual, siguiente, actual + 1);
            indices.push(siguiente, siguiente + 1, actual + 1);
        }
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

const esfera = crearEsfera(1.0, 32, 48);

const vertices = esfera.vertices;
const indices = esfera.indices;

// ------------------------------------------------------------
// 2. SHADERS
// ------------------------------------------------------------

const vertexShaderSource = `#version 300 es

in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoord;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

out vec3 vNormal;
out vec2 vTexCoord;

void main() {

    gl_Position =
        uProjectionMatrix *
        uViewMatrix *
        uModelMatrix *
        vec4(aPosition, 1.0);

    // Para este paso usamos solamente rotaciones y traslaciones.
    // Por ello transformamos la normal con la parte 3x3 de Model.
    vNormal = mat3(uModelMatrix) * aNormal;

    vTexCoord = aTexCoord;
}
`;

const fragmentShaderSource = `#version 300 es

precision highp float;

in vec3 vNormal;
in vec2 vTexCoord;

uniform vec3 uLightDirection;
uniform float uAmbientStrength;
uniform sampler2D uTexture;

out vec4 outColor;

void main() {

    vec3 N = normalize(vNormal);
    vec3 L = normalize(-uLightDirection);

    float diffuse = max(dot(N, L), 0.0);

    float illumination =
        uAmbientStrength +
        (1.0 - uAmbientStrength) * diffuse;

    vec4 texel = texture(uTexture, vTexCoord);

    vec3 finalColor = texel.rgb * illumination;

    outColor = vec4(finalColor, texel.a);
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

        throw new Error("Error al compilar shader:\n" + error);
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
// 4. VAO Y BUFFER DE VÉRTICES
// ------------------------------------------------------------

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// x y z | nx ny nz | u v = 8 floats
const stride = 8 * Float32Array.BYTES_PER_ELEMENT;

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

// Normal
const normalLocation = gl.getAttribLocation(program, "aNormal");
gl.enableVertexAttribArray(normalLocation);
gl.vertexAttribPointer(
    normalLocation,
    3,
    gl.FLOAT,
    false,
    stride,
    3 * Float32Array.BYTES_PER_ELEMENT
);

// UV
const texCoordLocation = gl.getAttribLocation(program, "aTexCoord");
gl.enableVertexAttribArray(texCoordLocation);
gl.vertexAttribPointer(
    texCoordLocation,
    2,
    gl.FLOAT,
    false,
    stride,
    6 * Float32Array.BYTES_PER_ELEMENT
);

// Índices
const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// ------------------------------------------------------------
// 5. CREAR TEXTURA PROCEDURAL
// Patrón de 8 x 4 texeles.
// ------------------------------------------------------------

function crearTexturaProcedural(gl) {

    const ancho = 8;
    const alto = 4;

    const datos = new Uint8Array(ancho * alto * 4);

    for (let y = 0; y < alto; y++) {

        for (let x = 0; x < ancho; x++) {

            const i = (y * ancho + x) * 4;

            const bloque = (x + y) % 2;

            if (bloque === 0) {
                // Amarillo / naranja
                datos[i + 0] = 255;
                datos[i + 1] = 150;
                datos[i + 2] = 20;
                datos[i + 3] = 255;
            } else {
                // Azul oscuro
                datos[i + 0] = 20;
                datos[i + 1] = 70;
                datos[i + 2] = 180;
                datos[i + 3] = 255;
            }
        }
    }

    const textura = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, textura);

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        ancho,
        alto,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        datos
    );

    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR
    );

    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MAG_FILTER,
        gl.LINEAR
    );

    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_WRAP_S,
        gl.REPEAT
    );

    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_WRAP_T,
        gl.CLAMP_TO_EDGE
    );

    return textura;
}

const texturaPlaneta = crearTexturaProcedural(gl);

// ------------------------------------------------------------
// 6. FUNCIONES VECTORIALES
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
// 7. MATRICES 4x4
// ------------------------------------------------------------

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
// 8. PERSPECTIVA Y LOOK AT
// ------------------------------------------------------------

function matrizPerspectiva(fov, aspect, near, far) {

    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);

    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, (2 * far * near) * nf, 0
    ]);
}

function matrizLookAt(eye, target, up) {

    const zAxis = normalizarVec3(
        restarVec3(eye, target)
    );

    const xAxis = normalizarVec3(
        productoCruz(up, zAxis)
    );

    const yAxis = productoCruz(zAxis, xAxis);

    return new Float32Array([
        xAxis[0], yAxis[0], zAxis[0], 0,
        xAxis[1], yAxis[1], zAxis[1], 0,
        xAxis[2], yAxis[2], zAxis[2], 0,

        -(xAxis[0] * eye[0] +
          xAxis[1] * eye[1] +
          xAxis[2] * eye[2]),

        -(yAxis[0] * eye[0] +
          yAxis[1] * eye[1] +
          yAxis[2] * eye[2]),

        -(zAxis[0] * eye[0] +
          zAxis[1] * eye[1] +
          zAxis[2] * eye[2]),

        1
    ]);
}

// ------------------------------------------------------------
// 9. UBICACIONES DE UNIFORMS
// ------------------------------------------------------------

const modelMatrixLocation =
    gl.getUniformLocation(program, "uModelMatrix");

const viewMatrixLocation =
    gl.getUniformLocation(program, "uViewMatrix");

const projectionMatrixLocation =
    gl.getUniformLocation(program, "uProjectionMatrix");

const lightDirectionLocation =
    gl.getUniformLocation(program, "uLightDirection");

const ambientStrengthLocation =
    gl.getUniformLocation(program, "uAmbientStrength");

const textureLocation =
    gl.getUniformLocation(program, "uTexture");

// ------------------------------------------------------------
// 10. CÁMARA Y PROYECCIÓN
// ------------------------------------------------------------

const eye = [0.0, 1.2, 4.0];
const target = [0.0, 0.0, 0.0];
const up = [0.0, 1.0, 0.0];

const viewMatrix = matrizLookAt(eye, target, up);

const fov = 60 * Math.PI / 180;
const aspect = canvas.width / canvas.height;

const projectionMatrix = matrizPerspectiva(
    fov,
    aspect,
    0.1,
    100.0
);

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
// 11. ILUMINACIÓN
// ------------------------------------------------------------

gl.uniform3f(
    lightDirectionLocation,
    -1.0,
    -0.5,
    -1.0
);

gl.uniform1f(
    ambientStrengthLocation,
    0.20
);

// ------------------------------------------------------------
// 12. ASOCIAR LA TEXTURA AL SAMPLER
// ------------------------------------------------------------

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texturaPlaneta);

// uTexture utilizará la unidad 0.
gl.uniform1i(textureLocation, 0);

// ------------------------------------------------------------
// 13. ANIMACIÓN
// ------------------------------------------------------------

let anguloX = 0;
let anguloY = 0;
let tiempoAnterior = 0;

const velocidadX = 0.10;
const velocidadY = 0.35;

function render(tiempoActual) {

    const tiempoSegundos = tiempoActual * 0.001;
    const deltaTime = tiempoSegundos - tiempoAnterior;
    tiempoAnterior = tiempoSegundos;

    anguloX += velocidadX * deltaTime;
    anguloY += velocidadY * deltaTime;

    const Rx = matrizRotacionX(anguloX);
    const Ry = matrizRotacionY(anguloY);

    const rotacion = multiplicarMat4(Ry, Rx);

    const T = matrizTraslacion4(0.0, 0.0, 0.0);

    const modelMatrix = multiplicarMat4(T, rotacion);

    gl.uniformMatrix4fv(
        modelMatrixLocation,
        false,
        modelMatrix
    );

    gl.clear(
        gl.COLOR_BUFFER_BIT |
        gl.DEPTH_BUFFER_BIT
    );

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
