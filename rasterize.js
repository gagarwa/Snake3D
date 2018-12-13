/* GLOBAL CONSTANTS AND VARIABLES */

/* BASIC GLOBALS */
const TESTING = true;
const GRASS_URL = "grass.jpg"; // grass image location
const BRICK_URL = "brick.jpg"; // brick image location
const GRAY_SNAKE_URL = "gray-snake.jpg"; // gray snake skin image location
const BLUE_SNAKE_URL = "blue-snake.jpg"; // blue snake skin image location
const EPSILON = 0.000001; // error value for floating point numbers

/* GRID INFORMATION */
const DEPTH = 1.0; // the play area depth
const CELL_SIZE = 0.05; // the size (height and width) of a cell in the grid
const BORDER = { BOTTOM: -1, TOP: 1, LEFT: -1, RIGHT: 1 }; // the border for the grid or playing field

/* SNAKE INIT DATA */
const DIRECTION = { UP: 0, DOWN: 1, LEFT: 2, RIGHT: 3 }; // enumerated directions
var PLAYER_SNAKE = {
    TEXTURE = BLUE_SNAKE_URL, // the snake texture
    MIN_SIZE = 10, // the min number of cells for the snake
    START_POS = vec3.fromValues(0, 0, DEPTH), // the starting position of the snake
    START_DIR = DIRECTION.LEFT // the starting direction of the snake
}
var AUTO_SNAKE = {
    TEXTURE = GRAY_SNAKE_URL, // the snake texture
    MIN_SIZE = 10, // the min number of cells for the snake
    START_POS = vec3.fromValues(0, 0, DEPTH), // the starting position of the snake
    START_DIR = DIRECTION.LEFT // the starting direction of the snake
}

/* WEBGL & GEOMETRY DATA */
var gl; // the all powerful gl object - It's all here folks!
var OBJ_TYPE = { SPHERE: 0, BOX: 1, FLAT: 2 }; // the types of supported objects
var OBJ_TYPE = { SPHERE: 0, BOX: 1, FLAT: 2 }; // the types of supported objects
var objects = []; // the objects drawn to scene
var numObjects = 0; // how many objects in input scene
var then = 0; // the last update time

/* SHADER PARAMETER LOCATIONS */
var vPosAttribLoc; // where to put position for vertex shader
var vTexAttribLoc; // where to put texture coords for vertex shader
var pvMatrixULoc; // where to put project view matrix for vertex shader
var texturizeULoc; // where to put texture? for fragment shader
var colorULoc; // where to put color for fragment shader
var samplerULoc; // where to put texture for fragment shader

/* VIEWS & CAMERAS */
const TOP_CAMERA = {
    eye: vec3.fromValues(0, 0, -0.5), // eye position in world space
    center: vec3.fromValues(0, 0, 0), // view direction in world space
    up: vec3.fromValues(0, 1, 0) // view up vector in world space
};
const SIDE_CAMERA = {
    eye: vec3.fromValues(0, 1.5, 0.5), // eye position in world space
    center: vec3.fromValues(0, 0, 0.5), // view direction in world space
    up: vec3.fromValues(0, 0, 1) // view up vector in world space
};
var camera = TOP_CAMERA; // the current view

/* HELPER FUNCTIONS */

// does stuff when keys are pressed
function handleKeyDown(event) {
    // set up needed view params
    var lookAt = vec3.create(), viewRight = vec3.create(), temp = vec3.create(); // lookat, right & temp vectors
    lookAt = vec3.normalize(lookAt, vec3.subtract(temp, camera.center, camera.eye)); // get lookat vector
    viewRight = vec3.normalize(viewRight, vec3.cross(temp, lookAt, camera.up)); // get view right vector
    var viewDelta = 1 / 30;

    switch (event.code) {

        // view change
        case "KeyA": // translate view left, rotate left with shift
            camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, viewRight, viewDelta));
            if (!event.getModifierState("Shift")) { camera.eye = vec3.add(camera.eye, camera.eye, vec3.scale(temp, viewRight, viewDelta)); }
            break;
        case "KeyD": // translate view right, rotate right with shift
            camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, viewRight, -viewDelta));
            if (!event.getModifierState("Shift")) { camera.eye = vec3.add(camera.eye, camera.eye, vec3.scale(temp, viewRight, -viewDelta)); }
            break;
        case "KeyS": // translate view backward, rotate up with shift
            if (event.getModifierState("Shift")) {
                camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, camera.up, viewDelta));
                camera.up = vec3.cross(camera.up, viewRight, vec3.subtract(lookAt, camera.center, camera.eye)); /* global side effect */
            } else {
                camera.eye = vec3.add(camera.eye, camera.eye, vec3.scale(temp, lookAt, -viewDelta));
                camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, lookAt, -viewDelta));
            } // end if shift not pressed
            break;
        case "KeyW": // translate view forward, rotate down with shift
            if (event.getModifierState("Shift")) {
                camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, camera.up, -viewDelta));
                camera.up = vec3.cross(camera.up, viewRight, vec3.subtract(lookAt, camera.center, camera.eye)); /* global side effect */
            } else {
                camera.eye = vec3.add(camera.eye, camera.eye, vec3.scale(temp, lookAt, viewDelta));
                camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, lookAt, viewDelta));
            } // end if shift not pressed
            break;
        case "KeyQ": // translate view up, rotate counterclockwise with shift
            if (event.getModifierState("Shift")) { camera.up = vec3.normalize(camera.up, vec3.add(camera.up, camera.up, vec3.scale(temp, viewRight, -viewDelta))); }
            else {
                camera.eye = vec3.add(camera.eye, camera.eye, vec3.scale(temp, camera.up, viewDelta));
                camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, camera.up, viewDelta));
            } // end if shift not pressed
            break;
        case "KeyE": // translate view down, rotate clockwise with shift
            if (event.getModifierState("Shift")) { camera.up = vec3.normalize(camera.up, vec3.add(camera.up, camera.up, vec3.scale(temp, viewRight, viewDelta))); }
            else {
                camera.eye = vec3.add(camera.eye, camera.eye, vec3.scale(temp, camera.up, -viewDelta));
                camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, camera.up, -viewDelta));
            } // end if shift not pressed
            break;

        // model selection
        case "Space":
            break;

    } // end switch
}

// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.
// SRC = https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
function loadTexture(url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const isPowerOf2 = function (value) {
        return (value & (value - 1)) == 0;
    };

    // Because images have to be download over the internet they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can use it immediately. When the image
    // has finished downloading we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);

    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);

        // WebGL1 has different requirements for power of 2 images vs non power of 2 images
        // so check if the image is a power of 2 in both dimensions.
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D); // Yes, it's a power of 2. Generate mips.
        } else {
            // No, it's not a power of 2. Turn off mips and set wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    };

    image.crossOrigin = "Anonymous";
    image.src = url;

    return texture;
}

// creates the requested object type
// expected obj properties: pos, axis, taxis, mtex
function drawObject(obj, type) {
    // set up the vertex arrays, tri index array
    obj.glVertices = []; // flat coord list for webgl
    obj.texCoords = []; // flat texture coord list for webgl
    obj.glTriangles = []; // flat index list for webgl
    obj.vtxCount = 0; // number of vertices in the object
    obj.triCount = 0; // number of triangles in the object

    // temp parameterization variables
    var vtx = vec3.clone(obj.pos);

    switch (type) {
        case OBJ_TYPE.SPHERE:
            const pts = 24;
            const x = vtx[0] + CELL_SIZE / 2;
            const y = vtx[1] + CELL_SIZE / 2;
            const z = vtx[2] + CELL_SIZE / 2;
            const r = CELL_SIZE / 2;

            // temp information for ellipsoid rows
            obj.texCoords = [0, 0]; // null texture coords
            var prevIndex = -1; // the index for the previous row
            var index = 0; // the index for the current row

            // set up the vertex array
            for (var theta = -Math.PI / 2; theta <= Math.PI / 2 + EPSILON; theta += Math.PI / pts) {
                var dz = r * Math.sin(theta) + z;
                for (var phi = -Math.PI; phi <= Math.PI + EPSILON; phi += Math.PI / (pts / 2)) {
                    var dx = r * Math.cos(theta) * Math.cos(phi) + x;
                    var dy = r * Math.cos(theta) * Math.sin(phi) + y;
                    obj.glVertices.push(dx, dy, dz); // put coords in set coord list
                    obj.vtxCount++;
                }

                // set up the triangle array
                if (prevIndex != -1) {
                    var idx = index;
                    for (var prev = prevIndex; prev < index; prev++) {
                        obj.glTriangles.push(prev, idx++); // put indices in set list
                        obj.triCount += 2;
                    }
                }

                // update sphere row information
                prevIndex = index;
                index = obj.vtxCount;
            }

            break;
        case OBJ_TYPE.BOX:
            // temp parameterization variables
            const axis = obj.axis;
            const cx = (axis == 0) ? 0 : CELL_SIZE;
            const cy = (axis == 0) ? CELL_SIZE : 0;

            // Front Face
            var tex = obj.mtex.front; // map to front texture
            obj.glVertices.push(vtx[0] + cx, vtx[1] + cy, vtx[2] + CELL_SIZE);
            obj.glVertices.push(vtx[0] + cx, vtx[1] + cy, vtx[2]);
            obj.vtxCount += 2;
            obj.texCoords.push(tex, 0, tex, 0.25);
            obj.glTriangles.push(0, 1, 3, 2); // first indices, front face
            obj.triCount += 2;

            // Cylinder Face
            tex = obj.mtex.right; // map to right texture
            for (var t = 0; t < 2; t++) {
                obj.glVertices.push(vtx[0], vtx[1], vtx[2]);
                obj.glVertices.push(vtx[0], vtx[1], vtx[2] + CELL_SIZE);
                obj.glVertices.push(vtx[0] + cx, vtx[1] + cy, vtx[2] + CELL_SIZE);
                obj.glVertices.push(vtx[0] + cx, vtx[1] + cy, vtx[2]);
                obj.glVertices.push(vtx[0], vtx[1], vtx[2]);
                obj.vtxCount += 5;

                for (var whichVtx = 0; whichVtx < 5; whichVtx++) {
                    obj.texCoords.push(tex, whichVtx * 0.25); // put tex coords in set coord list
                }

                if (t == 0) {
                    vtx[axis] = obj.taxis; // change to second position
                    tex = obj.mtex.left; // map to left texture
                    var index = obj.vtxCount; // the index for the second layer
                }
            }

            var idx = index;
            for (var whichVtx = 2; whichVtx < index; whichVtx++) {
                obj.glTriangles.push(whichVtx, idx++); // put indices in set list
                obj.triCount += 2;
            }

            // Back Face
            tex = obj.mtex.back; // map to back texture
            obj.glVertices.push(vtx[0], vtx[1], vtx[2] + CELL_SIZE); // index 12
            obj.glVertices.push(vtx[0] + cx, vtx[1] + cy, vtx[2] + CELL_SIZE); // index 13
            obj.vtxCount += 2;
            obj.texCoords.push(tex, 0.75, tex, 1.0);
            obj.glTriangles.push(11, 10, 12, 13); // last indices, back face
            break;
    }
}

// process object buffers
function processObject(obj) {
    // send the vertex coords and normals to webGL
    obj.vtxBuffer = gl.createBuffer(); // init empty webgl set vertex coord buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vtxBuffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.glVertices), gl.STATIC_DRAW); // data in

    // send the texture coords to webGL
    obj.texBuffer = gl.createBuffer(); // init empty webgl set texture coord buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.texBuffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.texCoords), gl.STATIC_DRAW); // data in

    // send the triangle indices to webGL
    obj.triBuffer = gl.createBuffer(); // init empty triangle index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.triBuffer); // activate that buffer
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.glTriangles), gl.STATIC_DRAW); // data in
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
        uniform vec3 uColor; // color of fragment

        // texture properties
        uniform sampler2D uSampler; // the texture sampler
        varying vec2 vTextureCoord; // texture of fragment

        void main(void) {
            if (uTexturize) {
                vec4 texColor = texture2D(uSampler, vTextureCoord); // texture color
                gl_FragColor = texColor;
            } else {
                gl_FragColor = vec4(uColor, 1.0); // fragment color
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
            gl.deleteShader(fShader);
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            gl.deleteShader(vShader);
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
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

// setup the snakes
function initSnakes() {
    // global parameters
    const texture = loadTexture(SNAKE_SKIN_URL); // load snake skin texture
    var pos = vec3.clone(SNAKE_START_POS); // the starting position
    const sdir = SNAKE_START_DIR; // the starting direction
    const axis = (sdir == DIRECTION.LEFT || sdir == DIRECTION.RIGHT) ? 0 : 1; // the axis of motion
    const dir = (sdir == DIRECTION.DOWN || sdir == DIRECTION.LEFT) ? 1 : -1; // the direction of motion (pos or neg)
    var tex = 0.0;

    for (var whichBox = 0; whichBox < SNAKE_MIN_SIZE; whichBox++) {
        var box = {}; // new box object

        // init
        box.texturize = true;
        box.texture = texture;
        box.pos = vec3.clone(pos); // the current position
        box.axis = axis; // the axis of movement
        box.taxis = pos[axis] - (dir * CELL_SIZE); // the next layer, based on axis
        box.mtex = {
            front: tex,
            right: tex + 0.1,
            left: tex + 0.2,
            back: tex + 0.3
        }; // the texture map

        var temp = vec3.clone(pos);
        temp[axis] += dir * CELL_SIZE;
        box.dir = sdir;
        box.next = temp; // the next position

        drawObject(box, OBJ_TYPE.BOX);
        processObject(box);
        objects[numObjects] = box;
        numObjects++;

        tex = (tex < 0.7 - EPSILON) ? tex + 0.1 : 0.0;
        pos[axis] -= dir * CELL_SIZE;
    }
}

// setup food and other items
function initObjects() {

}

/* UPDATE & PROCESSING FUNCTIONS */

// update the camera view
function updateView() {
    var pMatrix = mat4.create(); // projection matrix
    var vMatrix = mat4.create(); // view matrix
    pvMatrix = mat4.create(); // projection * view matrix

    // set up projection and view
    mat4.perspective(pMatrix, 0.5 * Math.PI, 1, 0.1, 10); // create projection matrix
    mat4.lookAt(vMatrix, camera.eye, camera.center, camera.up); // create view matrix
    mat4.multiply(pvMatrix, pvMatrix, pMatrix); // projection
    mat4.multiply(pvMatrix, pvMatrix, vMatrix); // projection * view

    gl.uniformMatrix4fv(pvMatrixULoc, false, pvMatrix); // pass in the pv matrix
}

// update snakes
function updateSnakes(dt) {

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
            gl.uniform3fv(colorULoc, object.color); // tell the shader the object color
        }

        // triangle buffer: activate and render
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.triBuffer); // activate
        gl.drawElements(gl.TRIANGLE_STRIP, object.glTriangles.length, gl.UNSIGNED_SHORT, 0); // render
    } // end for each object
}

// render frame
function renderFrame(now) {
    now *= 0.001; // convert the time to seconds
    var dt = now - then;
    then = now;

    updateView(); // update view
    updateSnakes(dt); // update snake
    renderObjects(); // render game objects
    requestAnimationFrame(renderFrame); // set up frame render callback
}

/* MAIN FUNCTIONS  */

// starts (or restarts) the game
function start() {
    initWebGL(); // set up the webGL environment
    initShaders(); // setup the webGL shaders
    initSnakes(); // setup the snake
    initObjects(); // setup food and other items

    renderFrame(); // draw the objects using webGL
}

// here is where execution begins after window load
function main() {
    start();
}
