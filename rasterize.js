/* GLOBAL CONSTANTS AND VARIABLES */

/* BASIC GLOBALS */
const GRASS_URL = "grass.jpg"; // grass image location
const BRICK_URL = "brick.jpg"; // brick image location
const GRAY_SNAKE_URL = "gray-snake.jpg"; // gray snake skin image location
const BLUE_SNAKE_URL = "blue-snake.jpg"; // blue snake skin image location
const EPSILON = 0.000001; // error value for floating point numbers

/* GRID INFORMATION */
const DEPTH = -0.8; // the play area depth
const CELL_SIZE = 0.05; // the size (height and width) of a cell in the grid
const GRID_SIZE = { WIDTH: 80, HEIGHT: 40 }; // the size of the grid
const BORDER = { BOTTOM: -1, TOP: 1, LEFT: -2, RIGHT: 2 }; // the border for the grid or playing field
var grid = []; // the field grid

/* SNAKE INIT DATA */
var ctx; // the 2d context for scores
const SPEED = 0.2; // the speed of the snakes (secs per unit)
const DIRECTION = { UP: 0, DOWN: 1, LEFT: 2, RIGHT: 3 }; // enumerated directions
var playerSnake = {
    TEXTURE: BLUE_SNAKE_URL, // the snake texture
    MIN_SIZE: 8, // the min number of cells for the snake
    START_POS: [20, 20], // the starting position of the snake
    START_DIR: DIRECTION.LEFT // the starting direction of the snake
};
var autoSnake = {
    TEXTURE: GRAY_SNAKE_URL, // the snake texture
    MIN_SIZE: 6, // the min number of cells for the snake
    START_POS: [10, 30], // the starting position of the snake
    START_DIR: DIRECTION.RIGHT, // the starting direction of the snake
    automatic: true // run automatically?
};
var snakes = [playerSnake, autoSnake];

/* WEBGL & GEOMETRY DATA */
var gl; // the all powerful gl object - It's all here folks!
var OBJ_FORM = { SPHERE: 0, BOX: 1, FLAT: 2 }; // the types of object forms
var OBJ_TYPE = { FOOD: 0, SOLID: 1, LAND: 2 }; // the types of objects
var objects = []; // the objects drawn to scene
var numObjects = 0; // how many objects in input scene
var then = 0; // the last update time

/* SHADER PARAMETER LOCATIONS */
var vPosAttribLoc; // where to put position for vertex shader
var vTexAttribLoc; // where to put texture coords for vertex shader
var pvmMatrixULoc; // where to put project view model matrix for vertex shader
var texturizeULoc; // where to put texture? for fragment shader
var colorULoc; // where to put color for fragment shader
var samplerULoc; // where to put texture for fragment shader

/* VIEWS & CAMERAS */
const TOP_CAMERA = {
    eye: vec3.fromValues(0, 0, 0.5), // eye position in world space
    center: vec3.fromValues(0, 0, 0), // view direction in world space
    up: vec3.fromValues(0, 1, 0) // view up vector in world space
};
const SIDE_CAMERA = {
    eye: vec3.fromValues(0, 1.5, 0.5), // eye position in world space
    center: vec3.fromValues(0, 0, 0.5), // view direction in world space
    up: vec3.fromValues(0, 0, 1) // view up vector in world space
};
var camera = TOP_CAMERA; // the current view
var pvMatrix; // the project view matrix

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
        case "KeyK": // translate view left, rotate left with shift
            camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, viewRight, viewDelta));
            if (!event.getModifierState("Shift")) { camera.eye = vec3.add(camera.eye, camera.eye, vec3.scale(temp, viewRight, viewDelta)); }
            break;
        case "Semicolon": // translate view right, rotate right with shift
            camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, viewRight, -viewDelta));
            if (!event.getModifierState("Shift")) { camera.eye = vec3.add(camera.eye, camera.eye, vec3.scale(temp, viewRight, -viewDelta)); }
            break;
        case "KeyL": // translate view backward, rotate up with shift
            if (event.getModifierState("Shift")) {
                camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, camera.up, viewDelta));
                camera.up = vec3.cross(camera.up, viewRight, vec3.subtract(lookAt, camera.center, camera.eye)); /* global side effect */
            } else {
                camera.eye = vec3.add(camera.eye, camera.eye, vec3.scale(temp, lookAt, -viewDelta));
                camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, lookAt, -viewDelta));
            } // end if shift not pressed
            break;
        case "KeyO": // translate view forward, rotate down with shift
            if (event.getModifierState("Shift")) {
                camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, camera.up, -viewDelta));
                camera.up = vec3.cross(camera.up, viewRight, vec3.subtract(lookAt, camera.center, camera.eye)); /* global side effect */
            } else {
                camera.eye = vec3.add(camera.eye, camera.eye, vec3.scale(temp, lookAt, viewDelta));
                camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, lookAt, viewDelta));
            } // end if shift not pressed
            break;
        case "KeyI": // translate view up, rotate counterclockwise with shift
            if (event.getModifierState("Shift")) { camera.up = vec3.normalize(camera.up, vec3.add(camera.up, camera.up, vec3.scale(temp, viewRight, -viewDelta))); }
            else {
                camera.eye = vec3.add(camera.eye, camera.eye, vec3.scale(temp, camera.up, viewDelta));
                camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, camera.up, viewDelta));
            } // end if shift not pressed
            break;
        case "KeyP": // translate view down, rotate clockwise with shift
            if (event.getModifierState("Shift")) { camera.up = vec3.normalize(camera.up, vec3.add(camera.up, camera.up, vec3.scale(temp, viewRight, viewDelta))); }
            else {
                camera.eye = vec3.add(camera.eye, camera.eye, vec3.scale(temp, camera.up, -viewDelta));
                camera.center = vec3.add(camera.center, camera.center, vec3.scale(temp, camera.up, -viewDelta));
            } // end if shift not pressed
            break;

        // player snake controls
        case "ArrowRight":
            if (playerSnake.dir == DIRECTION.UP || playerSnake.dir == DIRECTION.DOWN) {
                playerSnake.dir = DIRECTION.RIGHT;
            }
            break;
        case "ArrowLeft":
            if (playerSnake.dir == DIRECTION.UP || playerSnake.dir == DIRECTION.DOWN) {
                playerSnake.dir = DIRECTION.LEFT;
            }
            break;
        case "ArrowUp":
            if (playerSnake.dir == DIRECTION.RIGHT || playerSnake.dir == DIRECTION.LEFT) {
                playerSnake.dir = DIRECTION.UP;
            }
            break;
        case "ArrowDown":
            if (playerSnake.dir == DIRECTION.RIGHT || playerSnake.dir == DIRECTION.LEFT) {
                playerSnake.dir = DIRECTION.DOWN;
            }
            break;

        // second player (auto-snake) snake controls
        case "KeyD":
            autoSnake.automatic = false;
            if (autoSnake.dir == DIRECTION.UP || autoSnake.dir == DIRECTION.DOWN) {
                autoSnake.dir = DIRECTION.RIGHT;
            }
            break;
        case "KeyA":
            autoSnake.automatic = false;
            if (autoSnake.dir == DIRECTION.UP || autoSnake.dir == DIRECTION.DOWN) {
                autoSnake.dir = DIRECTION.LEFT;
            }
            break;
        case "KeyW":
            autoSnake.automatic = false;
            if (autoSnake.dir == DIRECTION.RIGHT || autoSnake.dir == DIRECTION.LEFT) {
                autoSnake.dir = DIRECTION.UP;
            }
            break;
        case "KeyS":
            autoSnake.automatic = false;
            if (autoSnake.dir == DIRECTION.RIGHT || autoSnake.dir == DIRECTION.LEFT) {
                autoSnake.dir = DIRECTION.DOWN;
            }
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
// expected obj properties: pos, tex, axis (for snakes)
function drawObject(obj, type) {
    // set up the vertex arrays, tri index array
    obj.glVertices = []; // flat coord list for webgl
    obj.texCoords = []; // flat texture coord list for webgl
    obj.glTriangles = []; // flat index list for webgl
    obj.vtxCount = 0; // number of vertices in the object
    obj.triCount = 0; // number of triangles in the object

    // temp parameterization variables
    obj.translation = vec3.create(); // empty translation vector
    var vtx = vec3.clone(obj.pos); // center position

    switch (type) {
        case OBJ_FORM.SPHERE:
            const pts = 24;
            const x = vtx[0];
            const y = vtx[1];
            const z = vtx[2] + CELL_SIZE / 2;
            const r = CELL_SIZE / 2;

            // temp information for ellipsoid rows
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
        case OBJ_FORM.BOX:
            vec3.add(vtx, vtx, vec3.fromValues(-CELL_SIZE / 2, -CELL_SIZE / 2, 0));

            // Front Face
            var tex = obj.tex.front; // map to front texture
            obj.glVertices.push(vtx[0], vtx[1], vtx[2] + CELL_SIZE); // top front
            obj.glVertices.push(vtx[0], vtx[1] + CELL_SIZE, vtx[2] + CELL_SIZE); // top back
            obj.vtxCount += 2;
            obj.texCoords.push(tex, 0, tex, 0.25);
            obj.glTriangles.push(1, 0, 3, 2); // first indices, front face
            obj.triCount += 2;

            // Cylinder Face
            tex = obj.tex.left; // map to left texture
            for (var t = 0; t < 2; t++) {
                obj.glVertices.push(vtx[0], vtx[1], vtx[2]); // bottom front
                obj.glVertices.push(vtx[0], vtx[1] + CELL_SIZE, vtx[2]); // bottom back
                obj.glVertices.push(vtx[0], vtx[1] + CELL_SIZE, vtx[2] + CELL_SIZE); // top back
                obj.glVertices.push(vtx[0], vtx[1], vtx[2] + CELL_SIZE); // top front
                obj.glVertices.push(vtx[0], vtx[1], vtx[2]); // bottom front
                obj.vtxCount += 5;

                for (var whichVtx = 0; whichVtx < 5; whichVtx++) {
                    obj.texCoords.push(tex, whichVtx * 0.25); // put tex coords in set coord list
                }

                if (t == 0) {
                    vtx[0] += CELL_SIZE;
                    tex = obj.tex.right; // map to right texture
                    var index = obj.vtxCount; // the index for the second layer
                }
            }

            var idx = index;
            for (var whichVtx = 2; whichVtx < index; whichVtx++) {
                obj.glTriangles.push(whichVtx, idx++); // put indices in set list
                obj.triCount += 2;
            }

            // Back Face
            tex = obj.tex.back; // map to back texture
            obj.glVertices.push(vtx[0], vtx[1] + CELL_SIZE, vtx[2]); // bottom back
            obj.glVertices.push(vtx[0], vtx[1] + CELL_SIZE, vtx[2] + CELL_SIZE); // top back
            obj.vtxCount += 2;
            obj.texCoords.push(tex, 1.0, tex, 0.75);
            obj.glTriangles.push(11, 10, 12, 13); // last indices, back face
            break;
        case OBJ_FORM.FLAT:
            vec3.add(vtx, vtx, vec3.fromValues(-CELL_SIZE / 2, -CELL_SIZE / 2, 0));
            var tex = obj.tex.left; // map to left texture
            obj.glVertices.push(vtx[0], vtx[1], vtx[2]);
            obj.glVertices.push(vtx[0] + CELL_SIZE, vtx[1], vtx[2]);
            obj.texCoords.push(tex, 0, tex, 1);

            tex = obj.tex.right; // map to right texture
            obj.glVertices.push(vtx[0], vtx[1] + CELL_SIZE, vtx[2]);
            obj.glVertices.push(vtx[0] + CELL_SIZE, vtx[1] + CELL_SIZE, vtx[2]);
            obj.texCoords.push(tex, 0, tex, 1);
            obj.vtxCount += 4;

            obj.glTriangles.push(0, 1, 2, 3); // put indices in set list
            obj.triCount += 2;
            break;
    }
}

// process object buffers
function processObject(obj) {
    // send the vertex coords and normals to webGL
    obj.vtxBuffer = gl.createBuffer(); // init empty webgl set vertex coord buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vtxBuffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.glVertices), gl.STATIC_DRAW); // data in

    if (obj.texturize) {
        // send the texture coords to webGL
        obj.texBuffer = gl.createBuffer(); // init empty webgl set texture coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.texBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.texCoords), gl.STATIC_DRAW); // data in
    }

    // send the triangle indices to webGL
    obj.triBuffer = gl.createBuffer(); // init empty triangle index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.triBuffer); // activate that buffer
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.glTriangles), gl.STATIC_DRAW); // data in
}

/* ADD OBJECT FUNCTIONS */

// create a snake box
function createSnakeBox(snake) {
    var box = {}; // new box object
    box.cell = snake.tail.prev;

    // init
    box.type = OBJ_TYPE.SOLID;
    box.texturize = true;
    box.texture = snake.tail.texture;
    box.pos = vec3.clone(box.cell.center); // the current position
    box.tex = {
        front: snake.tex,
        left: snake.tex + 0.1,
        right: snake.tex + 0.2,
        back: snake.tex + 0.3
    }; // the texture map

    box.next = snake.tail; // the next box
    snake.tail = box; // the tail box

    drawObject(box, OBJ_FORM.BOX);
    processObject(box);
    objects[numObjects] = box;
    numObjects++;

    snake.tex = (snake.tex < 0.7 - EPSILON) ? snake.tex + 0.1 : 0.0;
}

// create a snake food object
function createSnakeFood() {
    var food = {}; // the food object
    var t = 1 + Math.floor(Math.random() * GRID_SIZE.HEIGHT);
    var s = 1 + Math.floor(Math.random() * GRID_SIZE.WIDTH);
    food.cell = grid[t][s];
    autoSnake.foodVision = food.cell; // special AI snake vision

    // init
    food.type = OBJ_TYPE.FOOD;
    food.texturize = false;
    food.color = vec3.fromValues(0, 0, 1);
    food.pos = vec3.clone(food.cell.center); // the object position

    drawObject(food, OBJ_FORM.SPHERE);
    processObject(food);
    objects[numObjects] = food;
    numObjects++;
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

// setup the scoring interface
function initInterface() {
    var canvas = document.getElementById("myImageCanvas"); // create an image canvas
    ctx = canvas.getContext("2d"); // get a 2d context from it
    ctx.font = "24px sans-serif";

    ctx.textAlign = "right";
    ctx.fillStyle = "blue";
    ctx.fillText("P1 Blue: " + 0, 200, 36);

    ctx.textAlign = "left";
    ctx.fillStyle = "gray";
    ctx.fillText("P2 Gray: " + 0, 1200, 680);
}

// setup the webGL shaders
function initShaders() {

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 aVertexPosition; // vertex position
        attribute vec2 aTextureCoord; // texture coordinates

        uniform mat4 upvmMatrix; // the project view matrix
        varying vec2 vTextureCoord; // interpolated texture coords of vertex

        void main(void) {
            // vertex position
            gl_Position = upvmMatrix * vec4(aVertexPosition, 1.0);

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

                // locate uniforms
                pvmMatrixULoc = gl.getUniformLocation(shaderProgram, "upvmMatrix"); // ptr to pvmmat
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

// setup the grid
function initGrid() {
    var dt = BORDER.BOTTOM - CELL_SIZE / 2;
    var ds = BORDER.LEFT - CELL_SIZE / 2;
    for (var t = 0; t < GRID_SIZE.HEIGHT + 2; t++) {
        var y = t * CELL_SIZE + dt;
        var row = [];
        for (var s = 0; s < GRID_SIZE.WIDTH + 2; s++) {
            var x = s * CELL_SIZE + ds;
            var cell = {};
            row.push(cell);
            cell.center = vec3.fromValues(x, y, DEPTH);
            cell.x = s; // the x value
            cell.y = t; // the y value
        }
        grid[t] = row;
    }

    // directions to adjacent cells
    for (var t = 1; t < GRID_SIZE.HEIGHT + 1; t++) {
        for (var s = 1; s < GRID_SIZE.WIDTH + 1; s++) {
            var cell = grid[t][s];
            cell.right = grid[t][s + 1];
            cell.left = grid[t][s - 1];
            cell.top = grid[t + 1][s];
            cell.bottom = grid[t - 1][s];

            cell.getAdjacent = function (dir) {
                switch (dir) {
                    case DIRECTION.UP:
                        return this.top;
                    case DIRECTION.DOWN:
                        return this.bottom;
                    case DIRECTION.LEFT:
                        return this.left;
                    case DIRECTION.RIGHT:
                        return this.right;
                }
            };

            cell.getOpposite = function (dir) {
                switch (dir) {
                    case DIRECTION.UP:
                        return this.bottom;
                    case DIRECTION.DOWN:
                        return this.top;
                    case DIRECTION.LEFT:
                        return this.right;
                    case DIRECTION.RIGHT:
                        return this.left;
                }
            };
        }
    }
}

// setup a snake
function initSnake(snake) {
    // init snake
    var i = snake.START_POS;
    snake.pos = grid[i[1]][i[0]]; // the starting position
    snake.dir = snake.START_DIR; // the snake's direction of motion
    snake.tex = 0; // the starting texture layer
    snake.score = 0; // the snake's score

    if (snake == autoSnake)
        autoSnake.automatic = true; // reset auto-snake

    // snake parameters
    const texture = loadTexture(snake.TEXTURE); // load snake skin texture
    var cell = snake.pos;
    var next = null; // the lead box (next box)

    for (var whichBox = 0; whichBox < snake.MIN_SIZE; whichBox++) {
        var box = {}; // new box object
        box.cell = cell;
        if (whichBox == 0)
            snake.head = box; // the head box

        // init
        box.type = OBJ_TYPE.SOLID;
        box.texturize = true;
        box.texture = texture;
        box.pos = vec3.clone(box.cell.center); // the current position
        box.tex = {
            front: snake.tex,
            left: snake.tex + 0.1,
            right: snake.tex + 0.2,
            back: snake.tex + 0.3
        }; // the texture map

        box.next = next; // the next box
        snake.tail = box; // the tail box

        drawObject(box, OBJ_FORM.BOX);
        processObject(box);
        objects[numObjects] = box;
        numObjects++;

        snake.tex = (snake.tex < 0.7 - EPSILON) ? snake.tex + 0.1 : 0.0;
        cell = cell.getOpposite(snake.dir);
        next = box;
    }
}

// setup the snakes
function initSnakes() {
    for (var t = 0; t < snakes.length; t++) {
        var snake = snakes[t];
        initSnake(snake);
    }
}

// setup food and other items
function initObjects() {
    createSnakeFood(); // create initial snake food

    // brick wall parameters
    var texture = loadTexture(BRICK_URL); // load brick texture
    var tex = 0.0;

    var init = function (box) {
        // init
        box.type = OBJ_TYPE.SOLID;
        box.texturize = true;
        box.texture = texture;
        box.pos = vec3.clone(box.cell.center); // the current position
        box.tex = {
            front: tex,
            left: tex + 0.25,
            right: tex + 0.50,
            back: tex + 0.75
        }; // the texture map

        drawObject(box, OBJ_FORM.BOX);
        processObject(box);
        objects[numObjects] = box;
        numObjects++;

        tex = (tex < 0.25 - EPSILON) ? tex + 0.25 : 0.0;
    }

    for (var s = 0; s < GRID_SIZE.WIDTH + 2; s++) {
        var box = {}; // new box object
        box.cell = grid[0][s];
        init(box);

        var box = {}; // new box object
        box.cell = grid[GRID_SIZE.HEIGHT + 1][s];
        init(box);
    }

    for (var t = 1; t < GRID_SIZE.HEIGHT + 1; t++) {
        var box = {}; // new box object
        box.cell = grid[t][0];
        init(box);

        var box = {}; // new box object
        box.cell = grid[t][GRID_SIZE.WIDTH + 1];
        init(box);
    }

    // green grass parameters
    var texture = loadTexture(GRASS_URL); // load grass texture

    for (var t = 1; t < GRID_SIZE.HEIGHT + 1; t++) {
        for (var s = 1; s < GRID_SIZE.WIDTH + 1; s++) {
            var rec = {}; // new rectangle object
            rec.cell = grid[t][s];

            // init
            rec.type = OBJ_TYPE.LAND;
            rec.texturize = true;
            rec.texture = texture;
            rec.pos = vec3.clone(rec.cell.center); // the current position
            rec.tex = {
                left: 0,
                right: 1,
            }; // the texture map

            drawObject(rec, OBJ_FORM.FLAT);
            processObject(rec);
            objects[numObjects] = rec;
            numObjects++;
        }
    }
}

/* UPDATE & PROCESSING FUNCTIONS */

// update the camera view
function updateView() {
    var pMatrix = mat4.create(); // projection matrix
    var vMatrix = mat4.create(); // view matrix
    pvMatrix = mat4.create(); // proj * view matrix


    // set up projection and view
    mat4.perspective(pMatrix, 0.5 * Math.PI, 2, 0.1, 10); // create projection matrix
    mat4.lookAt(vMatrix, camera.eye, camera.center, camera.up); // create view matrix
    mat4.multiply(pvMatrix, pvMatrix, pMatrix); // projection
    mat4.multiply(pvMatrix, pvMatrix, vMatrix); // projection * view
}

// auto update snake
// expects auto-snake for auto-snake controls
function updateSnake(snake) {
    var vec = vec3.create();
    vec3.sub(vec, snake.foodVision.center, snake.head.cell.center);
    vec3.normalize(vec, vec);

    var dir; // the desired direction
    if (Math.abs(vec[0]) > Math.abs(vec[1])) { // x > y
        if (vec[0] < 0)
            dir = DIRECTION.LEFT;
        else
            dir = DIRECTION.RIGHT;
    } else { // y > x
        if (vec[1] < 0)
            dir = DIRECTION.DOWN;
        else
            dir = DIRECTION.UP;
    }

    // directional controls (to prevent self-mutilation)
    switch (dir) {
        case DIRECTION.RIGHT:
            if (snake.dir == DIRECTION.UP || snake.dir == DIRECTION.DOWN) {
                snake.dir = DIRECTION.RIGHT;
            }
            break;
        case DIRECTION.LEFT:
            if (snake.dir == DIRECTION.UP || snake.dir == DIRECTION.DOWN) {
                snake.dir = DIRECTION.LEFT;
            }
            break;
        case DIRECTION.UP:
            if (snake.dir == DIRECTION.RIGHT || snake.dir == DIRECTION.LEFT) {
                snake.dir = DIRECTION.UP;
            }
            break;
        case DIRECTION.DOWN:
            if (snake.dir == DIRECTION.RIGHT || snake.dir == DIRECTION.LEFT) {
                snake.dir = DIRECTION.DOWN;
            }
            break;
    }
}

// update snakes
function updateSnakes(dt) {
    var oneScale = false;
    var scale = dt / SPEED;
    if (dt > SPEED) {
        var multi = Math.floor(dt / SPEED); // to prevent racing due to lag
        then += multi * SPEED;
        oneScale = true;
        scale = 1.0;
    }

    var update = false; // update scores?
    if (autoSnake.automatic)
        updateSnake(autoSnake); // update AI snake

    for (var whichSnake = 0; whichSnake < snakes.length; whichSnake++) {
        var snake = snakes[whichSnake];

        // update snake direction
        snake.head.next = {
            cell: snake.head.cell.getAdjacent(snake.dir),
            next: null
        };

        // update positions
        var box = snake.tail;
        box.prev = box.cell; // the previous cell for additions
        while (box.next != null) {
            var temp = vec3.create();
            vec3.sub(temp, box.next.cell.center, box.cell.center);
            vec3.scale(temp, temp, scale);
            vec3.add(temp, temp, box.cell.center);
            vec3.sub(box.translation, temp, box.pos);
            if (oneScale)
                box.cell = box.next.cell;
            box = box.next;
        }

        // check collisions
        var toDestroy = []; // objects to destroy
        var remake = false; // remake snake?
        var head = snake.head;
        for (var whichObj = 0; whichObj < numObjects; whichObj++) {
            var obj = objects[whichObj];
            if (obj == head)
                continue; // ignore self-collision

            switch (obj.type) {
                case OBJ_TYPE.FOOD:
                    if (head.cell == obj.cell) { // collision
                        update = true;
                        snake.score++; // update score
                        createSnakeBox(snake);
                        createSnakeFood();
                        toDestroy.push(whichObj);
                    }
                    break;
                case OBJ_TYPE.SOLID:
                    if (head.cell == obj.cell) { // collision
                        remake = true; // resurrect snake
                        update = true; // update score

                        var box = snake.tail;
                        while (box.next != null) {
                            var i = objects.indexOf(box);
                            toDestroy.push(i);
                            box = box.next;
                        }
                    }
                    break;
            }
        }

        // destroy old objects
        if (toDestroy.length > 0) {
            toDestroy.sort(function (a, b) {
                return b - a;
            });
            toDestroy.forEach(function (e) {
                objects.splice(e, 1);
            });

            numObjects -= toDestroy.length;
            if (remake)
                initSnake(snake);
        }
    }

    // update scores
    if (update) {
        ctx.clearRect(0, 0, 1400, 700);
        ctx.textAlign = "right";
        ctx.fillStyle = "blue";
        ctx.fillText("P1 Blue: " + playerSnake.score, 200, 36);

        ctx.textAlign = "left";
        ctx.fillStyle = "gray";
        ctx.fillText("P2 Gray: " + autoSnake.score, 1200, 680);
    }
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
        gl.uniform1i(texturizeULoc, object.texturize); // texturize object?

        if (object.texturize) {
            gl.bindBuffer(gl.ARRAY_BUFFER, object.texBuffer); // activate
            gl.vertexAttribPointer(vTexAttribLoc, 2, gl.FLOAT, false, 0, 0); // feed
            gl.enableVertexAttribArray(vTexAttribLoc); // connect attrib to array

            // texture: feed to the fragment shader
            gl.activeTexture(gl.TEXTURE0); // tell webGL we want to affect texture unit 0
            gl.bindTexture(gl.TEXTURE_2D, object.texture); // bind the texture to texture unit 0
            gl.uniform1i(samplerULoc, 0); // tell the shader we bound the texture to texture unit 0
        } else {
            gl.uniform3fv(colorULoc, object.color); // tell the shader the object color
            gl.disableVertexAttribArray(vTexAttribLoc); // disconnect attrib from array
        }

        // object translation
        var mMatrix = mat4.create(); // model matrix
        var pvmMatrix = mat4.create(); // proj * view * model matrix
        mat4.fromTranslation(mMatrix, object.translation);
        mat4.multiply(pvmMatrix, pvMatrix, mMatrix); // projection * view * model
        gl.uniformMatrix4fv(pvmMatrixULoc, false, pvmMatrix); // pass in the pvm matrix

        // triangle buffer: activate and render
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.triBuffer); // activate
        gl.drawElements(gl.TRIANGLE_STRIP, object.glTriangles.length, gl.UNSIGNED_SHORT, 0); // render
    } // end for each object
}

// render frame
function renderFrame(now) {
    now *= 0.001; // convert the time to seconds
    var dt = now - then;

    updateView(); // update view
    updateSnakes(dt); // update snake
    renderObjects(); // render game objects
    requestAnimationFrame(renderFrame); // set up frame render callback
}

/* MAIN FUNCTION  */

// here is where execution begins after window load
function main() {
    initWebGL(); // set up the webGL environment
    initInterface(); // setup the scoring interface
    initShaders(); // setup the webGL shaders
    initGrid(); // setup the play grid
    initSnakes(); // setup the snake
    initObjects(); // setup food and other items

    requestAnimationFrame(renderFrame); // render frame
}
