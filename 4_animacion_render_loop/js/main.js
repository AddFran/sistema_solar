// ============================================================
// PASO 4 - ANIMACIÓN Y RENDER LOOP
// ============================================================
// En este paso reutilizamos casi todo lo aprendido en el Paso 2:
//  - Creamos el contexto WebGL.
//  - Creamos un buffer con los vértices.
//  - Compilamos shaders.
//  - Creamos un programa y un VAO.
//
// La diferencia principal es que ahora:
// 1. El Vertex Shader recibe una matriz de transformación.
// 2. Esa matriz cambia en cada frame.
// 3. Dibujamos continuamente usando requestAnimationFrame().
// ============================================================


// ------------------------------------------------------------
// 0. Obtener el canvas y el contexto WebGL2
// ------------------------------------------------------------
// Igual que en el Paso 2.
// "canvas" es la superficie donde WebGL dibuja.
// "gl" es la interfaz para comunicarnos con la GPU.

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");

// Verificamos que el navegador soporte WebGL2.
if (!gl) {
    throw new Error("WebGL2 no está disponible en este navegador.");
}


// ------------------------------------------------------------
// 1. Configurar el área de renderizado
// ------------------------------------------------------------
// Igual que en el Paso 2.
//
// viewport indica qué parte del canvas utilizará WebGL.
// clearColor define el color del fondo.

gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.0, 0.0, 0.0, 1.0);   // Fondo negro (RGBA)


// ------------------------------------------------------------
// 2. Geometría del triángulo
// ------------------------------------------------------------
// Igual que en el Paso 2.
//
// Creamos un arreglo de vértices.
// Cada vértice tiene dos coordenadas (x,y).

const vertices = new Float32Array([
     0.0,  0.35,   // vértice superior
    -0.35, -0.35,  // vértice inferior izquierdo
     0.35, -0.35   // vértice inferior derecho
]);

// Creamos un Vertex Buffer Object (VBO).
const vertexBuffer = gl.createBuffer();

// Lo activamos como ARRAY_BUFFER.
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

// Copiamos los vértices desde la CPU hacia la GPU.
gl.bufferData(
    gl.ARRAY_BUFFER,
    vertices,
    gl.STATIC_DRAW
);


// ------------------------------------------------------------
// 3. Vertex Shader y Fragment Shader
// ------------------------------------------------------------
// El Fragment Shader prácticamente no cambia.
//
// El Vertex Shader sí cambia respecto al Paso 2:
// ahora recibe una matriz uniforme (uModelMatrix)
// para transformar cada vértice antes de dibujarlo.

const vertexShaderSource = `#version 300 es

// Atributo que recibe la posición del buffer.
in vec2 aPosition;

// Uniform que enviará JavaScript en cada frame.
// Contiene la transformación del objeto.
uniform mat3 uModelMatrix;

void main() {

    // Convertimos el vec2 en vec3 usando coordenadas homogéneas.
    vec3 posicionLocal = vec3(aPosition, 1.0);

    // Aplicamos la transformación:
    // posición final = matriz * posición original.
    vec3 posicionTransformada = uModelMatrix * posicionLocal;

    // gl_Position siempre debe ser un vec4.
    gl_Position = vec4(
        posicionTransformada.xy,
        0.0,
        1.0
    );
}
`;

const fragmentShaderSource = `#version 300 es

precision highp float;

// Color de salida del fragmento.
out vec4 outColor;

void main() {

    // Triángulo amarillo.
    outColor = vec4(
        1.0,
        0.75,
        0.1,
        1.0
    );
}
`;


// ------------------------------------------------------------
// 4. Función para compilar shaders
// ------------------------------------------------------------
// Exactamente la misma idea del Paso 2.
//
// Toma el código GLSL y lo compila.
// Si existe un error, lo muestra.

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

// Compilamos ambos shaders.
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


// ------------------------------------------------------------
// 5. Crear el programa WebGL
// ------------------------------------------------------------
// Igual que en el Paso 2.
//
// Un programa une el Vertex Shader y el Fragment Shader.

const program = gl.createProgram();

gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);

gl.linkProgram(program);

// Verificamos que el enlace haya sido correcto.
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {

    throw new Error(
        "Error al enlazar programa:\n" +
        gl.getProgramInfoLog(program)
    );
}


// ------------------------------------------------------------
// 6. Configurar el atributo aPosition usando un VAO
// ------------------------------------------------------------
// Muy parecido al Paso 2.
//
// El VAO recuerda:
// - qué buffer contiene los datos.
// - qué atributo leer.
// - cómo interpretar esos datos.

const vao = gl.createVertexArray();

gl.bindVertexArray(vao);

// Activamos el buffer de vértices.
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

// Buscamos dónde está "aPosition" dentro del Vertex Shader.
const positionLocation =
    gl.getAttribLocation(program, "aPosition");

// Habilitamos ese atributo.
gl.enableVertexAttribArray(positionLocation);

// Explicamos cómo leer los datos del buffer.
//
// Cada vértice tiene:
//
// x y
//
// dos floats consecutivos.
gl.vertexAttribPointer(

    positionLocation, // atributo del shader

    2,                // componentes por vértice (x,y)

    gl.FLOAT,         // tipo de dato

    false,            // no normalizar

    0,                // stride (datos consecutivos)

    0                 // offset inicial
);


// ------------------------------------------------------------
// 7. Funciones para crear matrices 3x3
// ------------------------------------------------------------
// Estas funciones son nuevas.
//
// Construyen matrices de transformación en 2D.
// Utilizamos matrices 3x3 porque trabajamos
// con coordenadas homogéneas (x,y,1).


// ---------- Traslación ----------
function matrizTraslacion(tx, ty) {

    return new Float32Array([

        1,  0, 0,
        0,  1, 0,

        // Última columna contiene la traslación.
        tx, ty, 1
    ]);
}


// ---------- Rotación ----------
function matrizRotacion(anguloRadianes) {

    const c = Math.cos(anguloRadianes);
    const s = Math.sin(anguloRadianes);

    return new Float32Array([

         c, s, 0,
        -s, c, 0,
         0, 0, 1
    ]);
}


// ---------- Escala ----------
function matrizEscala(sx, sy) {

    return new Float32Array([

        sx, 0,  0,
        0, sy,  0,
        0,  0,  1
    ]);
}


// ------------------------------------------------------------
// Multiplicación de matrices 3x3
// ------------------------------------------------------------
// También es nueva.
//
// Permite combinar transformaciones.
//
// M = T * R * S

function multiplicarMat3(a, b) {

    const resultado = new Float32Array(9);

    // Recorremos columnas y filas.
    for (let columna = 0; columna < 3; columna++) {

        for (let fila = 0; fila < 3; fila++) {

            let suma = 0;

            // Producto punto fila x columna.
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


// ------------------------------------------------------------
// 8. Obtener la ubicación del uniform
// ------------------------------------------------------------
// Nuevo respecto al Paso 2.
//
// El Vertex Shader tiene:
//
// uniform mat3 uModelMatrix;
//
// Necesitamos saber dónde está almacenado
// para enviarle una matriz en cada frame.

gl.useProgram(program);

const modelMatrixLocation =
    gl.getUniformLocation(
        program,
        "uModelMatrix"
    );


// ------------------------------------------------------------
// 9. Estado de la animación
// ------------------------------------------------------------
// Variables que cambian durante la ejecución.

let angulo = 0.0;          // rotación acumulada
let tiempoAnterior = 0.0;  // tiempo del frame anterior

// Velocidad angular.
//
// 60 grados por segundo convertidos a radianes.
const velocidadAngular =
    60 * Math.PI / 180;


// ------------------------------------------------------------
// Transformaciones constantes
// ------------------------------------------------------------
// Estas matrices no cambian entre frames.

const T = matrizTraslacion(
    0.30,
    0.10
);

const S = matrizEscala(
    1.20,
    0.80
);


// ------------------------------------------------------------
// 10. Render Loop
// ------------------------------------------------------------
// Esta función es el corazón de la aplicación.
//
// El navegador la ejecuta aproximadamente
// una vez por cada actualización de pantalla
// (60 FPS, 120 FPS, etc.).

function render(tiempoActual) {

    // ----------------------------------------
    // Convertir milisegundos a segundos.
    // ----------------------------------------

    const tiempoSegundos =
        tiempoActual * 0.001;


    // ----------------------------------------
    // Calcular deltaTime.
    // ----------------------------------------
    // Tiempo transcurrido desde el frame anterior.

    let deltaTime =
        tiempoSegundos - tiempoAnterior;

    tiempoAnterior = tiempoSegundos;


    // Evitamos un salto muy grande
    // cuando la pestaña estuvo pausada.
    if (deltaTime > 0.1) {
        deltaTime = 0.0;
    }


    // ----------------------------------------
    // Actualizar el estado de la escena.
    // ----------------------------------------
    // Ángulo = ángulo + velocidad * tiempo.

    angulo +=
        velocidadAngular * deltaTime;


    // ----------------------------------------
    // Crear la nueva matriz de rotación.
    // ----------------------------------------

    const R = matrizRotacion(angulo);


    // ----------------------------------------
    // Combinar transformaciones.
    // ----------------------------------------
    // Primero escala.
    // Luego rota.
    // Finalmente traslada.
    //
    // M = T * R * S

    const RS =
        multiplicarMat3(R, S);

    const modelMatrix =
        multiplicarMat3(T, RS);


    // ----------------------------------------
    // Limpiar la pantalla.
    // ----------------------------------------
    // Igual que en el Paso 2.
    // Borra el contenido del frame anterior.

    gl.clear(gl.COLOR_BUFFER_BIT);


    // ----------------------------------------
    // Enviar la matriz al Vertex Shader.
    // ----------------------------------------
    // Esta parte es nueva.
    // El shader utilizará esta matriz
    // para transformar todos los vértices.

    gl.useProgram(program);

    gl.uniformMatrix3fv(

        modelMatrixLocation,

        false,          // no transponer

        modelMatrix      // matriz enviada a la GPU
    );


    // ----------------------------------------
    // Dibujar el triángulo.
    // ----------------------------------------
    // Igual que en el Paso 2.
    // Ahora los vértices ya fueron transformados
    // por la matriz del Vertex Shader.

    gl.bindVertexArray(vao);

    gl.drawArrays(

        gl.TRIANGLES,

        0,   // primer vértice

        3    // cantidad de vértices
    );


    // ----------------------------------------
    // Solicitar el siguiente frame.
    // ----------------------------------------
    // Aquí ocurre la animación.
    // El navegador volverá a llamar render()
    // antes del próximo refresco de pantalla.

    requestAnimationFrame(render);
}


// ------------------------------------------------------------
// 11. Iniciar la animación
// ------------------------------------------------------------
// Solo llamamos requestAnimationFrame una vez.
//
// A partir de aquí el propio render loop
// se encargará de llamarse continuamente.

requestAnimationFrame(render);