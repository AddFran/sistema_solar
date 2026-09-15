// Obtiene del documento HTML el elemento <canvas> cuyo id es "glCanvas"
const canvas = document.getElementById("glCanvas"); 
    // La variable "canvas" es una referencia al elemento con el id "glCanvas"
    // Buscamos en todo el documento la variable con el id "glCanvas"
    // "canvas" contiene el documento HTML completo

// Solicita al navegador un contexto de renderizado WebGL 2 para poder dibujar gráficos 3D.
const gl = canvas.getContext("webgl2");
    // Un contexto es un conjunto de funciones y propiedades que nos permiten dibujar en el canvas (tmb podemos)
    // Aqui solicitamos un contexto preparado para trabajar con WebGL 2
    

// Verifica si el navegador soporta WebGL2 y si el contexto fue creado correctamente
if (!gl) {
    // Si no hay soporte para WebGL2, detiene la ejecución mostrando un error
    throw new Error("WebGL2 no está disponible en este navegador.");
}

// Define el área del canvas donde WebGL dibujará
// Los parámetros son: x, y, ancho y alto del viewport
gl.viewport(0, 0, canvas.width, canvas.height);

// Establece el color con el que se limpiará el canvas.
// Formato RGBA: rojo, verde, azul y alfa (transparencia).
// Aquí se usa negro completamente opaco.
gl.clearColor(0.7, 0.0, 0.0, 1.0);

// Limpia el buffer de color del canvas usando el color definido anteriormente.
// Como el color es negro, el canvas se pinta completamente de negro.
gl.clear(gl.COLOR_BUFFER_BIT);



////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////



// ------------------------------------------------------------
// 2. Definir los tres vértices del triángulo
// Coordenadas NDC (Normalized Device Coordinates):
// x e y van desde -1 hasta 1.
// ------------------------------------------------------------

// Creamos un arreglo de números flotantes con las coordenadas de los vértices.
const vertices = new Float32Array([
    0.0,  0.7,   // Vértice superior (centro arriba)
    -0.7, -0.7,  // Vértice inferior izquierdo
    0.7, -0.7    // Vértice inferior derecho
]);

// ------------------------------------------------------------
// 3. Crear y llenar el buffer de vértices
// ------------------------------------------------------------

// Crea un buffer en la memoria de la GPU.
const vertexBuffer = gl.createBuffer();

// Activa el buffer para trabajar con él.
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

// Copia los datos de los vértices desde la CPU hacia la GPU.
// STATIC_DRAW indica que los datos no cambiarán frecuentemente.
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// ------------------------------------------------------------
// 4. Código del Vertex Shader
// ------------------------------------------------------------

// El Vertex Shader procesa cada vértice individualmente.
// Codigacho escrito en GLSL
const vertexShaderSource = `#version 300 es

// Recibe la posición de cada vértice desde el programa JavaScript.
in vec2 aPosition;

void main() {
    // Convierte la posición 2D en un vector 4D requerido por WebGL.
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// ------------------------------------------------------------
// 5. Código del Fragment Shader
// ------------------------------------------------------------

// El Fragment Shader calcula el color de cada píxel del triángulo.
const fragmentShaderSource = `#version 300 es

// Define la precisión de los cálculos en punto flotante.
precision highp float;

// Variable de salida con el color final del fragmento.
out vec4 outColor;

void main() {
    // Asigna un color amarillo/anaranjado opaco.
    outColor = vec4(1.0, 0.75, 0.1, 1.0);
}
`;

// ------------------------------------------------------------
// 6. Función para compilar un shader
// ------------------------------------------------------------

// Función reutilizable para crear y compilar shaders.
function crearShader(gl, tipo, codigoFuente) {
    // Crea un shader del tipo indicado (vertex o fragment).
    const shader = gl.createShader(tipo);

    // Envia el código fuente al shader.
    gl.shaderSource(shader, codigoFuente);

    // Compila el código GLSL.
    gl.compileShader(shader);

    // Comprueba si la compilación fue exitosa.
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        // Obtiene el mensaje de error generado por WebGL.
        const error = gl.getShaderInfoLog(shader);

        // Libera el shader defectuoso.
        gl.deleteShader(shader);

        // Lanza el error para facilitar la depuración.
        throw new Error("Error al compilar shader:\n" + error);
    }

    // Devuelve el shader compilado correctamente.
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
// 7. Crear y enlazar el programa WebGL
// ------------------------------------------------------------

// Crea un programa que combinará ambos shaders.
const program = gl.createProgram();

// Adjunta el Vertex Shader al programa.
gl.attachShader(program, vertexShader);

// Adjunta el Fragment Shader al programa.
gl.attachShader(program, fragmentShader);

// Enlaza ambos shaders en un único programa ejecutable.
gl.linkProgram(program);

// Verifica que el enlace se realizó correctamente.
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {

    // Si ocurre un error, muestra el mensaje generado por WebGL.
    throw new Error(
        "Error al enlazar programa:\n" + gl.getProgramInfoLog(program)
    );
}

// ------------------------------------------------------------
// 8. Configurar el atributo aPosition mediante un VAO
// ------------------------------------------------------------

// Crea un Vertex Array Object (VAO).
// El VAO guarda la configuración de los atributos de los vértices.
const vao = gl.createVertexArray();

// Activa el VAO para registrar la configuración.
gl.bindVertexArray(vao);

// Activa nuevamente el buffer de vértices.
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

// Obtiene la ubicación del atributo aPosition dentro del programa.
const positionLocation = gl.getAttribLocation(program, "aPosition");

// Habilita ese atributo para que pueda recibir datos.
gl.enableVertexAttribArray(positionLocation);

// Describe cómo leer los datos del buffer.
gl.vertexAttribPointer(
    positionLocation, // Índice del atributo en el shader.
    2,                // Cada vértice tiene 2 componentes: x e y.
    gl.FLOAT,         // Cada componente es un float.
    false,            // No convertir ni normalizar los datos.
    0,                // Sin separación adicional entre vértices.
    0                 // Comenzar desde el primer dato del buffer.
);

// ------------------------------------------------------------
// 9. Dibujar el triángulo
// ------------------------------------------------------------

// Activa el programa de shaders que usará la GPU.
gl.useProgram(program);

// Activa el VAO con la configuración de los atributos.
gl.bindVertexArray(vao);

// Dibuja los vértices como un triángulo.
// TRIANGLES: cada grupo de 3 vértices forma un triángulo.
// 0: comienza en el primer vértice.
// 3: utiliza tres vértices.
gl.drawArrays(
    gl.TRIANGLES,
    0,
    3
);