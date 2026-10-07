const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");

if (!gl) throw new Error("WebGL2 no está disponible.");

gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.01, 0.01, 0.03, 1.0);
gl.enable(gl.DEPTH_TEST);

function crearEsfera(radio, latitudes, longitudes) {
    const vertices = [];
    const indices = [];
    for (let lat = 0; lat <= latitudes; lat++) {
        const v = lat / latitudes;
        const phi = v * Math.PI;
        for (let lon = 0; lon <= longitudes; lon++) {
            const u = lon / longitudes;
            const theta = u * Math.PI * 2;

            const nx = Math.sin(phi) * Math.cos(theta);
            const ny = Math.cos(phi);
            const nz = Math.sin(phi) * Math.sin(theta);

            vertices.push(radio * nx, radio * ny, radio * nz);
            vertices.push(nx, ny, nz);
            vertices.push(u, 1.0 - v);
        }
    }

    const columnas = longitudes + 1;

    for (let lat = 0; lat < latitudes; lat++) {
        for (let lon = 0; lon < longitudes; lon++) {
            const a = lat * columnas + lon;
            const b = a + columnas;
            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices)
    };
}

const esfera = crearEsfera(1.0, 32, 48);

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
    vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);

    gl_Position =
        uProjectionMatrix *
        uViewMatrix *
        worldPosition;

    vNormal = normalize(mat3(uModelMatrix) * aNormal);
    vTexCoord = aTexCoord;
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec3 vNormal;
in vec2 vTexCoord;

uniform sampler2D uTexture;
uniform vec3 uLightDirection;
uniform bool uEmissive;

out vec4 outColor;

void main() {
    vec3 colorTextura = texture(uTexture, vTexCoord).rgb;

    if (uEmissive) {
        outColor = vec4(colorTextura, 1.0);
        return;
    }

    vec3 N = normalize(vNormal);
    vec3 L = normalize(-uLightDirection);

    float difusa = max(dot(N, L), 0.0);
    float ambiente = 0.15;

    vec3 colorFinal =
        colorTextura * (ambiente + difusa);

    outColor = vec4(colorFinal, 1.0);
}
`;

function crearShader(tipo, fuente) {
    const shader = gl.createShader(tipo);
    gl.shaderSource(shader, fuente);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
}

const vs = crearShader(gl.VERTEX_SHADER, vertexShaderSource);
const fs = crearShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}
gl.useProgram(program);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, esfera.vertices, gl.STATIC_DRAW);

const ebo = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, esfera.indices, gl.STATIC_DRAW);

const stride = 8 * Float32Array.BYTES_PER_ELEMENT;

const posLoc = gl.getAttribLocation(program, "aPosition");
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0);

const normalLoc = gl.getAttribLocation(program, "aNormal");
gl.enableVertexAttribArray(normalLoc);
gl.vertexAttribPointer(
    normalLoc, 3, gl.FLOAT, false, stride,
    3 * Float32Array.BYTES_PER_ELEMENT
);

const uvLoc = gl.getAttribLocation(program, "aTexCoord");
gl.enableVertexAttribArray(uvLoc);
gl.vertexAttribPointer(
    uvLoc, 2, gl.FLOAT, false, stride,
    6 * Float32Array.BYTES_PER_ELEMENT
);

// ------------------------------------------------------------
// 4. MATRICES Y VECTORES
// ------------------------------------------------------------
function multiplicarMat4(a, b) {
    const r = new Float32Array(16);
    for (let c = 0; c < 4; c++)
        for (let f = 0; f < 4; f++)
            for (let k = 0; k < 4; k++)
                r[c * 4 + f] += a[k * 4 + f] * b[c * 4 + k];
    return r;
}

function traslacion(x, y, z) {
    return new Float32Array([
        1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1
    ]);
}

function escala(x, y, z) {
    return new Float32Array([
        x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1
    ]);
}

function rotacionY(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([
         c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1
    ]);
}

function restar(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
function normalizar(v){
    const l=Math.hypot(v[0],v[1],v[2]);
    return [v[0]/l,v[1]/l,v[2]/l];
}
function cruz(a,b){
    return [
        a[1]*b[2]-a[2]*b[1],
        a[2]*b[0]-a[0]*b[2],
        a[0]*b[1]-a[1]*b[0]
    ];
}

function lookAt(eye,target,up){
    const z=normalizar(restar(eye,target));
    const x=normalizar(cruz(up,z));
    const y=cruz(z,x);

    return new Float32Array([
        x[0],y[0],z[0],0,
        x[1],y[1],z[1],0,
        x[2],y[2],z[2],0,
        -(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),
        -(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),
        -(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),
        1
    ]);
}

function perspectiva(fov,aspect,near,far){
    const f=1/Math.tan(fov/2);
    const nf=1/(near-far);

    return new Float32Array([
        f/aspect,0,0,0,
        0,f,0,0,
        0,0,(far+near)*nf,-1,
        0,0,2*far*near*nf,0
    ]);
}

// ------------------------------------------------------------
// 5. CARGAR UNA TEXTURA REAL
// ------------------------------------------------------------
function cargarTextura(url) {
    const textura = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textura);

    // Píxel temporal mientras carga la imagen.
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA,
        1, 1, 0,
        gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255])
    );

    const imagen = new Image();

    imagen.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, textura);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA,
            gl.RGBA, gl.UNSIGNED_BYTE,
            imagen
        );

        gl.generateMipmap(gl.TEXTURE_2D);

        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            gl.LINEAR_MIPMAP_LINEAR
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
    };

    imagen.src = url;
    return textura;
}

const texturaSol = cargarTextura("texturas/sol.jpg");
const texturaTierra = cargarTextura("texturas/tierra.jpg");

// ------------------------------------------------------------
// 6. UNIFORMS Y CÁMARA
// ------------------------------------------------------------
const modelLoc = gl.getUniformLocation(program, "uModelMatrix");
const viewLoc = gl.getUniformLocation(program, "uViewMatrix");
const projectionLoc = gl.getUniformLocation(program, "uProjectionMatrix");
const textureLoc = gl.getUniformLocation(program, "uTexture");
const lightLoc = gl.getUniformLocation(program, "uLightDirection");
const emissiveLoc = gl.getUniformLocation(program, "uEmissive");

const view = lookAt(
    [0.0, 3.0, 9.0],
    [0.0, 0.0, 0.0],
    [0.0, 1.0, 0.0]
);

const projection = perspectiva(
    60 * Math.PI / 180,
    canvas.width / canvas.height,
    0.1,
    100.0
);

gl.uniformMatrix4fv(viewLoc, false, view);
gl.uniformMatrix4fv(projectionLoc, false, projection);
gl.uniform3f(lightLoc, -1.0, -0.3, -0.5);
gl.uniform1i(textureLoc, 0);

// ------------------------------------------------------------
// 7. FUNCIÓN GENÉRICA DE DIBUJO
// ------------------------------------------------------------
function dibujarCuerpo(textura, modelMatrix, emisivo) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textura);

    gl.uniformMatrix4fv(modelLoc, false, modelMatrix);
    gl.uniform1i(emissiveLoc, emisivo ? 1 : 0);

    gl.drawElements(
        gl.TRIANGLES,
        esfera.indices.length,
        gl.UNSIGNED_SHORT,
        0
    );
}

// ------------------------------------------------------------
// 8. RENDER LOOP
// ------------------------------------------------------------
let tiempoAnterior = 0;
let giroSol = 0;
let giroTierra = 0;

function render(ms) {
    const tiempo = ms * 0.001;
    const dt = tiempo - tiempoAnterior;
    tiempoAnterior = tiempo;

    giroSol += 0.10 * dt;
    giroTierra += 0.45 * dt;

    gl.clear(
        gl.COLOR_BUFFER_BIT |
        gl.DEPTH_BUFFER_BIT
    );

    gl.bindVertexArray(vao);

    // SOL: grande, en el origen y emisivo.
    const modelSol =
        multiplicarMat4(
            rotacionY(giroSol),
            escala(1.35, 1.35, 1.35)
        );

    dibujarCuerpo(
        texturaSol,
        modelSol,
        true
    );

    // TIERRA: más pequeña y desplazada.
    const modelTierra =
        multiplicarMat4(
            traslacion(3.0, 0.0, 0.0),
            multiplicarMat4(
                rotacionY(giroTierra),
                escala(0.55, 0.55, 0.55)
            )
        );

    dibujarCuerpo(
        texturaTierra,
        modelTierra,
        false
    );

    requestAnimationFrame(render);
}

requestAnimationFrame(render);
