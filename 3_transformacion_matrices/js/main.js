// ------------------------------------------------------------
// PASO 3 - TRANSFORMACIONES MATRICIALES 2D
// En este ejemplo el triángulo ya no se mueve modificando sus
// vértices, sino aplicando una matriz de transformación.
// ------------------------------------------------------------

// Obtiene el elemento <canvas> del HTML.
const canvas = document.getElementById("glCanvas");

// Obtiene el contexto WebGL2 para renderizar gráficos.
const gl = canvas.getContext("webgl2");

// Verifica que WebGL2 esté disponible.
if (!gl) {
    throw new Error("WebGL2 no está disponible en este navegador.");
}

// ------------------------------------------------------------
// 1. Preparar el área de renderizado
// ------------------------------------------------------------

// Define que se utilizará toda el área del canvas para dibujar.
gl.viewport(0,0,canvas.width,canvas.height);

// Define el color de fondo (negro, totalmente opaco).
gl.clearColor(0.0, 0.0, 0.0, 1.0);

// ------------------------------------------------------------
// 2. Geometría original del triángulo
// Los vértices permanecen fijos en memoria.
// Las transformaciones se harán con matrices.
// ------------------------------------------------------------

// Arreglo de coordenadas del triángulo en coordenadas NDC.
const vertices = new Float32Array([
    0.0,  0.35,   // Vértice superior.
    -0.35, -0.35, // Vértice inferior izquierdo.
    0.35, -0.35   // Vértice inferior derecho.
]);

// Crea un buffer en la GPU para almacenar los vértices.
const vertexBuffer = gl.createBuffer();

// Activa el buffer recién creado.
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

// Copia los vértices al buffer de la GPU.
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// ------------------------------------------------------------
// 3. Vertex Shader
// Recibe una matriz uniforme (uModelMatrix) y transforma
// cada vértice antes de dibujarlo.
// ------------------------------------------------------------

const vertexShaderSource = `#version 300 es

// Posición del vértice enviada desde JavaScript.
in vec2 aPosition;

// Matriz de transformación enviada desde JavaScript.
uniform mat3 uModelMatrix;

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

// ------------------------------------------------------------
// 4. Fragment Shader
// Se encarga únicamente del color del triángulo.
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// 5. Compilar shaders
// ------------------------------------------------------------

// Función reutilizable para crear y compilar shaders.
function crearShader(gl, tipo, codigoFuente) {

    // Crea un shader del tipo especificado.
    const shader = gl.createShader(tipo);

    // Asigna el código GLSL.
    gl.shaderSource(shader, codigoFuente);

    // Compila el shader.
    gl.compileShader(shader);

    // Comprueba si hubo errores de compilación.
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {

        const error = gl.getShaderInfoLog(shader);

        gl.deleteShader(shader);

        throw new Error("Error al compilar shader:\n" + error);
    }

    // Devuelve el shader compilado.
    return shader;
}

// Compila el Vertex Shader.
const vertexShader = crearShader(
    gl,
    gl.VERTEX_SHADER,
    vertexShaderSource
);

// Compila el Fragment Shader.
const fragmentShader = crearShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
);

// ------------------------------------------------------------
// 6. Crear programa WebGL
// ------------------------------------------------------------

// Crea un programa que combinará ambos shaders.
const program = gl.createProgram();

// Agrega el Vertex Shader.
gl.attachShader(program, vertexShader);

// Agrega el Fragment Shader.
gl.attachShader(program, fragmentShader);

// Enlaza ambos shaders.
gl.linkProgram(program);

// Comprueba que el enlace fue exitoso.
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {

    throw new Error(
        "Error al enlazar programa:\n" + gl.getProgramInfoLog(program)
    );
}

// ------------------------------------------------------------
// 7. Configurar atributo aPosition mediante VAO
// ------------------------------------------------------------

// Crea un Vertex Array Object para guardar la configuración.
const vao = gl.createVertexArray();

// Activa el VAO.
gl.bindVertexArray(vao);

// Activa el buffer de vértices.
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

// Busca la ubicación del atributo aPosition.
const positionLocation = gl.getAttribLocation(program, "aPosition");

// Habilita ese atributo.
gl.enableVertexAttribArray(positionLocation);

// Indica cómo leer cada vértice del buffer.
gl.vertexAttribPointer(
    positionLocation, // Atributo del shader.
    2,                // Dos componentes: x, y.
    gl.FLOAT,         // Tipo float.
    false,            // No normalizar.
    0,                // Sin separación adicional.
    0                 // Comenzar desde el inicio.
);

// ------------------------------------------------------------
// 8. Funciones matemáticas para matrices 3x3
// Todas devuelven matrices en formato Float32Array.
// WebGL espera matrices almacenadas por columnas.
// ------------------------------------------------------------

// Matriz identidad: no produce ninguna transformación.
function matrizIdentidad() {
    return new Float32Array([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ]);
}

// Crea una matriz de traslación.k
// tx y ty representan cuánto mover el objeto.
function matrizTraslacion(tx, ty) {
    return new Float32Array([
        1,  0, 0,
        0,  1, 0,
        tx, ty, 1
    ]);
}

// Crea una matriz de rotación.
// El ángulo debe estar en radianes.
function matrizRotacion(anguloRadianes) {

    // Calcula coseno y seno del ángulo.
    const c = Math.cos(anguloRadianes);
    const s = Math.sin(anguloRadianes);

    return new Float32Array([
         c, s, 0,
        -s, c, 0,
         0, 0, 1
    ]);
}

// Crea una matriz de escala.
// sx y sy controlan el tamaño en cada eje.
function matrizEscala(sx, sy) {
    return new Float32Array([
        sx, 0,  0,
        0,  sy, 0,
        0,  0,  1
    ]);
}

// Multiplica dos matrices 3x3.
// Devuelve una nueva matriz resultado = A × B.
function multiplicarMat3(a, b) {

    // Arreglo donde se almacenará el resultado.
    const resultado = new Float32Array(9);

    // Recorre cada columna de la matriz resultado.
    for (let columna = 0; columna < 3; columna++) {

        // Recorre cada fila.
        for (let fila = 0; fila < 3; fila++) {

            let suma = 0;

            // Producto punto entre fila y columna.
            for (let k = 0; k < 3; k++) {

                suma +=
                    a[k * 3 + fila] *
                    b[columna * 3 + k];
            }

            // Guarda el valor calculado.
            resultado[columna * 3 + fila] = suma;
        }
    }

    return resultado;
}

// ------------------------------------------------------------
// 9. Parámetros de transformación
// Modificando estos valores cambia la posición,
// orientación y tamaño del triángulo.
// ------------------------------------------------------------

// Desplazamiento horizontal.
const tx = 0.30;

// Desplazamiento vertical.
const ty = 0.10;

// Ángulo de rotación en grados.
const anguloGrados = 35;

// Conversión de grados a radianes.
const anguloRadianes = anguloGrados * Math.PI / 180;

// Escala horizontal.
const sx = 1.20;

// Escala vertical.
const sy = 0.80;

// ------------------------------------------------------------
// 10. Construir la matriz de modelo
//
// M = T × R × S
//
// El orden importa:
// 1. Escalar.
// 2. Rotar.
// 3. Trasladar.
// ------------------------------------------------------------

// Matriz de traslación.
const T = matrizTraslacion(tx, ty);

// Matriz de rotación.
const R = matrizRotacion(anguloRadianes);

// Matriz de escala.
const S = matrizEscala(sx, sy);

// Primero combina rotación y escala.
const RS = multiplicarMat3(R, S);

// Luego aplica la traslación al resultado anterior.
const modelMatrix = multiplicarMat3(T, RS);

// ------------------------------------------------------------
// 11. Enviar la matriz al Vertex Shader
// ------------------------------------------------------------

// Activa el programa de shaders.
gl.useProgram(program);

// Busca la ubicación del uniform uModelMatrix.
const modelMatrixLocation =
    gl.getUniformLocation(program, "uModelMatrix");

// Envía la matriz a la GPU.
// false indica que no debe transponerse.
gl.uniformMatrix3fv(
    modelMatrixLocation,
    false,
    modelMatrix
);

// ------------------------------------------------------------
// 12. Renderizar el triángulo transformado
// ------------------------------------------------------------

// Limpia el canvas utilizando el color de fondo.
gl.clear(gl.COLOR_BUFFER_BIT);

// Activa el VAO con la configuración de los vértices.
gl.bindVertexArray(vao);

// Dibuja el triángulo aplicando la matriz de modelo.
gl.drawArrays(
    gl.TRIANGLES,
    0,
    3
);