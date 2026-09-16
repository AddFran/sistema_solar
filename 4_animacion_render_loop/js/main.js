// Pasos ya conocidos de trabajos anteriores
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL2 no está disponible en este navegador.");
}

gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.0, 0.0, 0.0, 1.0); 


// Definimos los vertices de un triangulo
const vertices = new Float32Array([
     0.0,  0.35,   
    -0.35, -0.35,  
     0.35, -0.35   
]);

const vertexBuffer = gl.createBuffer();                 // Creamos un buffer en la GPU
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);           // Indicamos que cuando usemos ARRAY_BUFFER nos referimos a vertexBuffer
gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW); // Copiamos los vertices al vextexBuffer en la GPU


// Aqui viene algo interesante, agrgamos una MATRIZ DE TRANSFORMACION
    // Con esta matriz podemos hacer traslaciones, rotaciones y escalados de los vertices del triangulo
const vertexShaderSource = `#version 300 es

// Atributo que recibe la posición del buffer.
in vec2 aPosition;

// Uniform que enviara JavaScript en cada frame.
uniform mat3 uModelMatrix;
    // Contiene la transformación del objeto.
    // Esta variable es global y solo de lectura en el shader

void main() {
    // Convertimos el vec2 en vec3 usando coordenadas homogéneas.
    vec3 posicionLocal = vec3(aPosition, 1.0);

    // Transformamos la posición del vértice usando la matriz de transformación
    vec3 posicionTransformada = uModelMatrix * posicionLocal; 
        // Cada vertice es transformado antes de dibujarse
        // Esto permite mover, rotar y escalar el triangulo sin cambiar los vertices originales

    // gl_Position siempre debe ser un vec4  
    gl_Position = vec4(
        posicionTransformada.xy,
        0.0,
        1.0
    );
}
`;


// Nada diferente, sigue igual que en pasos anteriores. El fragment shader solo pinta el triángulo de color amarillo
const fragmentShaderSource = `#version 300 es

precision highp float;

// Color de salida del fragmento.
out vec4 outColor;

void main() {
    // Triángulo amarillo.
    outColor = vec4(1.0,0.75,0.1,1.0);
}
`;

// Funcion para crear un shader a partir de su codigo fuente
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

// Compilamos ambos shaders
const vertexShader = crearShader(gl,gl.VERTEX_SHADER,vertexShaderSource);
const fragmentShader = crearShader(gl,gl.FRAGMENT_SHADER,fragmentShaderSource);

// Creamos el programa
const program = gl.createProgram();
gl.attachShader(program,vertexShader);
gl.attachShader(program,fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program,gl.LINK_STATUS)) {
    throw new Error(
        "Error al enlazar programa:\n" +
        gl.getProgramInfoLog(program)
    );
}

// VAO
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

const positionLocation =
    gl.getAttribLocation(program, "aPosition");

gl.enableVertexAttribArray(positionLocation);

gl.vertexAttribPointer(
    positionLocation, // atributo del shader
    2,                // componentes por vértice (x,y)
    gl.FLOAT,         // tipo de dato
    false,            // no normalizar
    0,                // stride (datos consecutivos)
    0                 // offset inicial
);


// ------------------------------------------------------------
// Funciones para crear matrices 3x3
// ------------------------------------------------------------
// Recuerdas que el vertexShader transforma la posicion de un vertice usando una matriz de transformacion
// Estas funciones nos permiten crear matrices de traslacion, rotacion y escalado para enviar al vertexShader

// Traslacion, mover el objeto
function matrizTraslacion(tx, ty) {
    return new Float32Array([
        1,  0, 0,
        0,  1, 0,
        // Última columna contiene la traslación.
        tx, ty, 1
    ]);
}

// Rotacion, girar el objeto
function matrizRotacion(anguloRadianes) {
    const c = Math.cos(anguloRadianes);
    const s = Math.sin(anguloRadianes);

    return new Float32Array([
         c, s, 0,
        -s, c, 0,
         0, 0, 1
    ]);
}

// Escalado, cambiar el tamaño del objeto
function matrizEscala(sx, sy) {
    return new Float32Array([
        sx, 0,  0,
        0, sy,  0,
        0,  0,  1
    ]);
}

// Multiplicar, permite combinar varias transformaciones en una sola matriz 3x3
function multiplicarMat3(a, b) {
    const resultado = new Float32Array(9);
    // Recorremos columnas y filas.
    for (let columna=0;columna<3;columna++){
        for (let fila=0;fila<3;fila++){
            let suma=0;
            // Producto punto fila x columna.
            for(let k=0;k<3;k++){
                suma+=a[k*3+fila]*b[columna*3+k];
            }
            resultado[columna*3+fila]=suma;
        }
    }
    return resultado;
}

// Obtener la ubicación del uniform
    // El Vertex Shader tiene: uniform mat3 uModelMatrix;
    // Necesitamos saber dónde está almacenado para enviarle una matriz en cada frame

// Busca la ubicacion del uniform "uModelMatrix" en el programa
gl.useProgram(program);
// Guarda la ubicación en la variable modelMatrixLocation
const modelMatrixLocation =
    gl.getUniformLocation(
        program,
        "uModelMatrix"
    );


// Variables que cambian durante la ejecución.
let angulo = 0.0;          // rotación acumulada
let tiempoAnterior = 0.0;  // tiempo del frame anterior

// Velocidad angular:
// 60 grados por segundo convertidos a radianes.
const velocidadAngular = 60 * Math.PI / 180;


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
// Render Loop
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
    const tiempoSegundos = tiempoActual * 0.001;


    // ----------------------------------------
    // Calcular deltaTime
    // ----------------------------------------
    // Tiempo transcurrido desde el frame anterior.
    let deltaTime = tiempoSegundos - tiempoAnterior;
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
    angulo += velocidadAngular * deltaTime;


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

    const RS = multiplicarMat3(R, S);
    const modelMatrix = multiplicarMat3(T, RS);


    // ----------------------------------------
    // Limpiar la pantalla.
    // ----------------------------------------
    // Igual que en el Paso 2
    // Borra el contenido del frame anterior

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
        false,               // no transponer
        modelMatrix          // matriz enviada a la GPU
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