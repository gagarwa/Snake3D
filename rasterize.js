/* GLOBAL CONSTANTS AND VARIABLES */

/* BASIC GLOBALS */
const TESTING = true;
const SNAKE_SKIN_URL = "http://cdn.designbeep.com/wp-content/uploads/2013/02/8.snake-textures.jpg"; // snake skin image location
const EPSILON = 0.000001; // error value for floating point numbers
const CELL_SIZE = 0.05; // the size (height and width) of a cell in the grid
const BORDER = { bottom: -1, top: 1, left: -1, right: 1 }; // the border for the grid or playing field
const DIRECTION = {
    UP: vec2.fromValues(0, 1),
    DOWN: vec2.fromValues(0, -1),
    LEFT: vec2.fromValues(-1, 0),
    RIGHT: vec2.fromValues(1, 0),
}; // enumerated directions
const SNAKE_MIN_SIZE = 10; // the min number of cells for the snake
const SNAKE_START_POS = vec3.fromValues(0, 0, 0.5); // the starting position of the snake
const SNAKE_START_DIR = DIRECTION.LEFT; // the starting direction of the snake

/* WEBGL & GEOMETRY DATA */
var gl = null; // the all powerful gl object - It's all here folks!
var objects = []; // the objects drawn to scene
var numObjects = 0; // how many objects in input scene

/* SHADER PARAMETER LOCATIONS */
var vPosAttribLoc; // where to put position for vertex shader
var vTexAttribLoc; // where to put texture coords for vertex shader
var pvMatrixULoc; // where to put project view matrix for vertex shader
var texturizeULoc; // where to put texture? for fragment shader
var colorULoc; // where to put color for fragment shader
var samplerULoc; // where to put texture for fragment shader

/* VIEWS & CAMERAS */
const FRONT_CAMERA = {
    eye: vec3.fromValues(0, 0, -0.5), // eye position in world space
    center: vec3.fromValues(0, 0, 0.5), // view direction in world space
    up: vec3.fromValues(0, 1, 0) // view up vector in world space
};
var pvMatrix = mat4.create(); // proj * view matrices

/* HELPER FUNCTIONS */

// does stuff when keys are pressed
function handleKeyDown(event) {
    // set up needed view params
    var lookAt = vec3.create(), viewRight = vec3.create(), temp = vec3.create(); // lookat, right & temp vectors
    lookAt = vec3.normalize(lookAt, vec3.subtract(temp, center, Eye)); // get lookat vector
    viewRight = vec3.normalize(viewRight, vec3.cross(temp, lookAt, Up)); // get view right vector

    switch (event.code) {

        // model selection
        case "Space":
            if (handleKeyDown.modelOn != null)
                handleKeyDown.modelOn.on = false; // turn off highlighted model
            handleKeyDown.modelOn = null; // no highlighted model
            handleKeyDown.whichOn = -1; // nothing highlighted
            break;

    } // end switch

    if (TESTING)
        window.requestAnimationFrame(renderModels); // set up frame render callback
}

// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.
// SRC = https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
function loadTexture(url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const isPowerOf2 = function (value) {
        return (value & (value - 1)) == 0;
    }

    // Because images have to be download over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        width, height, border, srcFormat, srcType,
        pixel);

    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.src = url;
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
            srcFormat, srcType, image);

        // WebGL1 has different requirements for power of 2 images
        // vs non power of 2 images so check if the image is a
        // power of 2 in both dimensions.
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // No, it's not a power of 2. Turn off mips and set
            // wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            console.log("working");
        }

        if (TESTING)
            window.requestAnimationFrame(renderModels); // set up frame render callback
    };

    return texture;
}

/* INIT FUNCTIONS */

// setup the WebGL environment
function initWebGL() {
    // Set up keys
    document.onkeydown = handleKeyDown; // call this when key pressed

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a Webgl object from it

    try {
        if (gl == null) {
            throw "unable to create gl context -- is your browser gl ready?";
        } else {
            gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
            gl.clearDepth(1.0); // use max when we clear the depth buffer
            gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // alpha blending
            gl.enable(gl.BLEND); // activate blending
        }
    } // end try

    catch (e) {
        console.log(e);
    } // end catch
}

// setup the webGL shaders
function initShaders() {

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 aVertexPosition; // vertex position
        attribute vec2 aTextureCoord; // texture coordinates
        
        uniform mat4 upvMatrix; // the project view matrix
        varying vec2 vTextureCoord; // interpolated texture coords of vertex

        void main(void) {
            // vertex position
            gl_Position = upvMatrix * vec4(aVertexPosition, 1.0);

            // texture coordinates
            vTextureCoord = aTextureCoord;
        }
    `;

    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float; // set float to medium precision
        
        // material properties
        uniform bool uTexturize; // use texture?
        uniform vec3 vColor; // color of fragment

        // texture properties
        uniform sampler2D uSampler; // the texture sampler
        varying vec2 vTextureCoord; // texture of fragment

        void main(void) {
            if (uTexturize) {
                vec4 texColor = texture2D(uSampler, vTextureCoord); // texture color
                gl_FragColor = texColor;
            } else {
                gl_FragColor = vec4(vColor, 1.0); // fragment color
            }
        }
    `;

    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader, fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader, vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution

        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)

                // locate and enable vertex attributes
                vPosAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexPosition"); // ptr to vertex pos attrib
                gl.enableVertexAttribArray(vPosAttribLoc); // connect attrib to array
                vTexAttribLoc = gl.getAttribLocation(shaderProgram, "aTextureCoord"); // ptr to texture coord attrib
                gl.enableVertexAttribArray(vTexAttribLoc); // connect attrib to array

                // locate uniforms
                pvMatrixULoc = gl.getUniformLocation(shaderProgram, "upvMatrix"); // ptr to pvmat
                texturizeULoc = gl.getUniformLocation(shaderProgram, "uTexturize"); // ptr to texturize
                colorULoc = gl.getUniformLocation(shaderProgram, "uColor"); // ptr to color
                samplerULoc = gl.getUniformLocation(shaderProgram, "uSampler"); // ptr to sampler
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 

    catch (e) {
        console.log(e);
    } // end catch
}

// setup the camera views
function initView() {
    var pMatrix = mat4.create(); // projection matrix
    var vMatrix = mat4.create(); // view matrix

    // set up projection and view
    mat4.perspective(pMatrix, 0.5 * Math.PI, 1, 0.1, 10); // create projection matrix
    mat4.lookAt(vMatrix, FRONT_CAMERA.eye, FRONT_CAMERA.center, FRONT_CAMERA.up); // create view matrix
    mat4.multiply(pvMatrix, pvMatrix, pMatrix); // projection
    mat4.multiply(pvMatrix, pvMatrix, vMatrix); // projection * view

    gl.uniformMatrix4fv(pvMatrixULoc, false, pvMatrix); // pass in the pv matrix
}

// setup the snake
function initSnake() {
    var snake = {}; // the snake object

    // init
    snake.pos = SNAKE_START_POS; // the starting position
    snake.dir = SNAKE_START_DIR; // the starting direction
    snake.texLayer = 0.0; // the current texture layer

    // load texture
    snake.texturize = true; // texturize?
    snake.texture = loadTexture(SNAKE_SKIN_URL); // load snake skin texture

    // set up the vertex arrays
    snake.glVertices = []; // flat coord list for webgl
    snake.texCoords = []; // flat texture coord list for webgl

    // set up the triangle index array
    snake.glTriangles = []; // flat index list for webgl
    snake.vtxCount = 0; // number of vertices in the snake
    snake.triCount = 0; // number of triangles in the snake

    // temp parameterization variables
    var vtx = vec3.clone(snake.pos);
    var prevIndex = -1; // the index for the previous layer
    var index = 0; // the index for the current layer
    var axis = (snake.dir == DIRECTION.LEFT || snake.dir == DIRECTION.RIGHT) ? 0 : 1; // the axis of motion
    var dir = (snake.dir == DIRECTION.DOWN || snake.dir == DIRECTION.LEFT) ? 1 : -1; // the direction of motion (pos or neg)
    var x = (axis == 0) ? 0 : CELL_SIZE;
    var y = (axis == 0) ? CELL_SIZE : 0;

    snake.glTriangles.push(0); // first index
    for (var whichLay = 0; whichLay < SNAKE_MIN_SIZE + 1; whichLay++) {
        snake.glVertices.push(vtx[0], vtx[1], vtx[2]); // put coords in set coord list
        snake.glVertices.push(vtx[0], vtx[1], vtx[2] + CELL_SIZE);
        snake.glVertices.push(vtx[0] + x, vtx[1] + y, vtx[2] + CELL_SIZE);
        snake.glVertices.push(vtx[0] + x, vtx[1] + y, vtx[2]);
        snake.glVertices.push(vtx[0], vtx[1], vtx[2]);
        snake.vtxCount += 5;

        for (var whichVtx = 0; whichVtx < 5; whichVtx++) {
            snake.texCoords.push(snake.texLayer, whichVtx * 0.25); // put tex coords in set coord list
        }

        if (prevIndex != -1) {
            var idx = index;
            snake.glTriangles.push(idx++);
            for (var whichVtx = prevIndex + 1; whichVtx < index; whichVtx++) {
                snake.glTriangles.push(whichVtx, idx++); // put indices in set list
                snake.triCount += 2;
            }
        }

        snake.texLayer = (snake.texLayer < 1.0 - EPSILON) ? snake.texLayer + 0.1 : 0.0;
        vtx[axis] += dir * CELL_SIZE;
        prevIndex = index;
        index += 5;
    }

    objects[0] = snake;
    numObjects++;
}

// setup food and other items
function initObjects() {
    if (inputEllipsoids != String.null) {
        // process each ellipsoid to load webgl vertex and triangle buffers
        numEllipsoids = inputEllipsoids.length; // remember how many tri sets
        for (var whichSet = 0; whichSet < numEllipsoids; whichSet++) { // for each ellipsoid tri set
            // ellipsoid description
            inputEllipsoids[whichSet].ellipsoid = true; // is ellipsoid?
            var x = inputEllipsoids[whichSet].x;
            var y = inputEllipsoids[whichSet].y;
            var z = inputEllipsoids[whichSet].z;
            var r = GRID_SIZE;

            // load texture
            var texture = inputEllipsoids[whichSet].texture;
            inputEllipsoids[whichSet].texture = loadTexture(BASE_URL + texture);

            // set up the vertex and normal arrays, define model center and axes
            inputEllipsoids[whichSet].glVertices = []; // flat coord list for webgl
            inputEllipsoids[whichSet].texCoords = []; // flat texture coord list for webgl
            inputEllipsoids[whichSet].glTriangles = []; // flat index list for webgl

            // temp information for ellipsoid rows
            var prevRowIndex = -1; // the index for the previous row
            var whichRow = []; // current row
            var whichRowIndex = 0; // the index for the current row
            var vertexCount = 0; // the total vertex count
            var triCount = 0 // the total triangle count

            // set up the vertex coord and normal arrays
            for (var theta = -Math.PI / 2; theta <= Math.PI / 2 + EPSILON; theta += Math.PI / 24) {
                var dz = c * Math.sin(theta) + z;
                for (var phi = -Math.PI; phi <= Math.PI + EPSILON; phi += Math.PI / 12) {
                    var dx = a * Math.cos(theta) * Math.cos(phi) + x;
                    var dy = b * Math.cos(theta) * Math.sin(phi) + y;
                    whichRow.push(dx, dy, dz);
                    inputEllipsoids[whichSet].glVertices.push(dx, dy, dz); // put coords in set coord list
                    inputEllipsoids[whichSet].texCoords.push(0.5 - phi / (2 * Math.PI), theta / (Math.PI) + 0.5); // put tex coords in set coord list
                    vertexCount++;
                }

                // set up the triangle array
                if (prevRowIndex >= 0) {
                    var rowVertices = 24 + 1; // the number of vertices in a row
                    var which = whichRowIndex;
                    for (var prev = prevRowIndex; prev < prevRowIndex + rowVertices; prev++) {
                        if (prev == prevRowIndex + rowVertices - 1) {
                            // inputEllipsoids[whichSet].glTriangles.push(prevRowIndex); // coming in full circle
                            inputEllipsoids[whichSet].glTriangles.push(prev, which, prevRowIndex, which, prevRowIndex, whichRowIndex);
                        } else {
                            // inputEllipsoids[whichSet].glTriangles.push(prev, which++); // put triangle indices in set list
                            inputEllipsoids[whichSet].glTriangles.push(prev, which, prev + 1, which, prev + 1, which + 1);
                        }

                        which++;
                        triCount += 2;
                    }
                }

                // update ellipsoid row information
                prevRowIndex = whichRowIndex;
                whichRow = [];
                whichRowIndex = vertexCount;
            } // end for each ellipsoid row

            inputEllipsoids[whichSet].tris = triCount; // number of triangles in this set
        } // end for each ellipsoid
    } // end if ellipsoids found
}

/* UPDATE & PROCESSING FUNCTIONS */

// update snake
function updateSnake() {

}

// process object buffers
function processObjects() {
    // process object buffers
    for (var whichObj = 0; whichObj < numObjects; whichObj++) { // for each object
        // send the vertex coords and normals to webGL
        objects[whichObj].vtxBuffer = gl.createBuffer(); // init empty webgl set vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, objects[whichObj].vtxBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(objects[whichObj].glVertices), gl.STATIC_DRAW); // data in

        // send the texture coords to webGL
        objects[whichObj].texBuffer = gl.createBuffer(); // init empty webgl set texture coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, objects[whichObj].texBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(objects[whichObj].texCoords), gl.STATIC_DRAW); // data in

        // send the triangle indices to webGL
        objects[whichObj].triBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objects[whichObj].triBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(objects[whichObj].glTriangles), gl.STATIC_DRAW); // data in
    } // end for objects
}

/* RENDER FUNCTIONS */

// render game objects
function renderObjects() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

    // render each object
    for (var whichObj = 0; whichObj < numObjects; whichObj++) {
        var object = objects[whichObj];

        // vertex buffer: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER, object.vtxBuffer); // activate
        gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed
        gl.bindBuffer(gl.ARRAY_BUFFER, object.texBuffer); // activate
        gl.vertexAttribPointer(vTexAttribLoc, 2, gl.FLOAT, false, 0, 0); // feed

        gl.uniform1i(texturizeULoc, object.texturize); // texturize object?

        if (object.texturize) {
            // texture: feed to the fragment shader
            gl.activeTexture(gl.TEXTURE0); // tell webGL we want to affect texture unit 0
            gl.bindTexture(gl.TEXTURE_2D, object.texture); // bind the texture to texture unit 0
            gl.uniform1i(samplerULoc, 0); // tell the shader we bound the texture to texture unit 0
        } else {
            gl.uniform3fv(texturizeULoc, object.color); // tell the shader the object color
        }

        // triangle buffer: activate and render
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.triBuffer); // activate
        gl.drawElements(gl.TRIANGLE_STRIP, object.glTriangles.length, gl.UNSIGNED_SHORT, 0); // render
    } // end for each object
}

// render frame
function renderFrame() {
    updateSnake(); // update snake
    processObjects(); // process game objects
    renderObjects(); // render game objects
    window.requestAnimationFrame(renderFrame); // set up frame render callback
}

/* MAIN FUNCTION  */

// here is where execution begins after window load
function main() {
    initWebGL(); // set up the webGL environment
    initShaders(); // setup the webGL shaders
    initView(); // setup the default view
    initSnake(); // setup the snake
    // initObjects(); // setup food and other items

    renderFrame(); // draw the objects using webGL
}
