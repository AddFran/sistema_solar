# COMPUTACIÓN GRAFICA

Área de la informática dedicada a la creación, representación, transformación, almacenamiento y visualización de información mediante imágenes generadas o procesadas por computadora.
No se limita solo a dibujar, pues incluye modelos matemáticos, algoritmos, estructuras de datos y procesos de hardware y software que permiten convertir una descripción de una escena en una imagen visible.

En un entorno 3D, los objetos se forman a través de algoritmos, formas, materiales, texturas, luces, cámaras, etc. El sistema los procesa y muestra al usuario.

- Píxel: Unidad discreta de imagen.
- Resolución: Cuantos pixeles se utilizan horizontalmente y verticalmente.
- Framebuffer: Región de memoria que almacena los valores de color de los pixeles.

## Rasterización y Gráficos Vectoriales

- Raster: Matriz de pixeles donde cada pixel tiene un color especifico. Ideal para fotografías, texturas y usan del framebuffer.
- Vectorial: Formas descritas vectorialmente, definidas por ecuaciones matemáticas. Se pueden escalar sin perder calidad.

## Graficos 2D y 3D

Para 2D (x,y), para 3D (x,y,z). Pero una pantalla es 2D, asi que es una tarea fundamental mostrar 3D en 2D... o algo asi.

## CPU

Procesador de proposito general. Logica de la aplicacion, eventos, estructuras de datos, carga de recursos y preparacion de información.

## GPU

Especializada en realizar grandes cantidades de operaciones graficas y matematicas en paralelo. Procesa vertices, ejecuta shaders y produce los valores que terminan dando forma a la imagen.

## Pipeline

### 1. Datos de entrada: 
La aplicación define posiciones de vértices y, posteriormente, índices, normales, coordenadas UV y otros atributos.

### 2. Vertex Shader: 
Programa ejecutado para cada vértice. Puede transformar su posición y preparar información para etapas posteriores.

### 3. Ensamblado de primitivas: 
Los vértices se interpretan como puntos, líneas o, principalmente, triángulos.

### 4. Rasterización: 
Las primitivas se convierten en fragmentos candidatos a ocupar píxeles de la imagen.

### 5. Fragment Shader: 
Programa ejecutado sobre fragmentos. Determina valores de color y participa en efectos de materiales, iluminación y texturas.

### 6. Pruebas y combinación: 
Se aplican procesos como profundidad y mezcla antes de escribir el resultado en el framebuffer.

### 7. Presentación: 
El contenido resultante termina mostrándose en el Canvas y, finalmente, en la pantalla.

## Cosas

### HTML Canvas

Area de la pagina donde se presentara la imagen grafica. Contendra la salida de WebGL

### JavaScript

Controla la aplicación desde la GPU. Creara datos, animación, objetos, camara e interacciones.

### WebGL2

API grafica disponible en el navegador. Permitira enviar datos y ordenes a la GPU.

### GLSL

Lenguaje de programacion para shaders.

## Shader

Un shader es un programa diseñado para ejecutarse en etapas concretas del pipeline gráfico. En la Unidad I se trabajará principalmente con dos: Vertex Shader y Fragment Shader. El primero participa en el procesamiento de vértices; el segundo en el cálculo del resultado visual de los fragmentos.

