var canvas;
var gl;

var points = [];
var colors = [];

var NumTimesToSubdivide = 3; // default subdivision
var scaleLoc; // scale location
//var initialScale = 1;
var scale = [1, 1, 1]; // default scale

var speed = 1;
var axis = 2; //(x=0, y=1, z=2)
var theta = [0, 0, 0];
var thetaLoc;

var time = 0;
var stop = true;

var cBuffer;
var vBuffer;
var vColor;
var vPosition;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    createGasket();

    //  Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // Enable hidden-surface removal
    gl.enable(gl.DEPTH_TEST);

    //  Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Create a buffer object, initialize it, and associate it with the
    // associated attribute variable in our vertex shader
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    thetaLoc = gl.getUniformLocation(program, "theta");
    scaleLoc = gl.getUniformLocation(program, "scale");
    gl.uniform3fv(scaleLoc, scale);

    // Parameters
    // Speed
    document.getElementById("speed-range").onchange = function () {
        speed = document.getElementById("speed-range").value;
    };

    // Number of subdivision
    document.getElementById("subdivision-range").onchange = function () {
        NumTimesToSubdivide =
            document.getElementById("subdivision-range").value;
        points = [];
        colors = [];
        createGasket();
        //divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], NumTimesToSubdivide);
        render();
    };

    // Rotation
    document.getElementById("x-rotate").onchange = function () {
        theta[0] = document.getElementById("x-rotate").value;
        render();
    };
    document.getElementById("y-rotate").onchange = function () {
        theta[1] = document.getElementById("y-rotate").value;
        render();
    };
    document.getElementById("z-rotate").onchange = function () {
        theta[2] = document.getElementById("z-rotate").value;
        render();
    };

    // Scale
    document.getElementById("x-scale").onchange = function () {
        scale[0] = document.getElementById("x-scale").value;
        gl.uniform3fv(scaleLoc, scale);
        render();
    };
    document.getElementById("y-scale").onchange = function () {
        scale[1] = document.getElementById("y-scale").value;
        gl.uniform3fv(scaleLoc, scale);
        render();
    };
    document.getElementById("z-scale").onchange = function () {
        scale[2] = document.getElementById("z-scale").value;
        gl.uniform3fv(scaleLoc, scale);
        render();
    };

    // Reset transformation (Rotation & Scale)
    document.getElementById("reset-transformation").onclick = function () {
        // Reset rotation
        document.getElementById("x-rotate").value = 0;
        document.getElementById("y-rotate").value = 0;
        document.getElementById("z-rotate").value = 0;
        theta = [0, 0, 0];
        // Reset Scale
        document.getElementById("x-scale").value = 1;
        document.getElementById("y-scale").value = 1;
        document.getElementById("z-scale").value = 1;
        scale = [1, 1, 1];
        gl.uniform3fv(scaleLoc, scale);
        render();
    };

    // Animation
    // Start Animation
    document.getElementById("start").onclick = function () {
        disableInput(); // disable input from user during animation
        document.getElementById("reset-transformation").click(); // reset the gasket rotation and scale
        theta = [0, 0, 0];
        scale = [1, 1, 1];
        gl.uniform3fv(scaleLoc, scale);
        render();
        stop = false; // repeat the animation
    };

    // Reset animation
    document.getElementById("reset").onclick = function () {
        //window.location.reload();

        document.getElementById("speed-range").value = 1;
        document.getElementById("subdivision-range").value = 3;
        speed = 1;
        NumTimesToSubdivide = 3;
        //color1 = vec3(1.0, 0.0, 0.0);
        //color2 = vec3(0.0, 1.0, 0.0);
        //color3 = vec3(0.0, 0.0, 1.0);
        //color4 = vec3(0.0, 0.0, 0.0);
        gl.clearColor(0.5, 0.5, 0.5, 1.0);
        points = [];
        colors = [];
        createGasket();
        //divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], NumTimesToSubdivide);
        render();
    };

    // Stop Animation
    document.getElementById("stop").onclick = function () {
        enableInput(); // enable input from user
        stop = true; // stop animation
        time = 0;
        theta = [0, 0, 0];
        scale = [1, 1, 1];
        gl.uniform3fv(scaleLoc, scale);

        document.getElementById("gl-canvas").onclick = function () {
            document.getElementById("start").click();
        };
    };

    // Start animation when canvas is clicked
    document.getElementById("gl-canvas").onclick = function () {
        document.getElementById("start").click();
    };

    startAnimation();
    render();
};

//
//  Initialize our data for the Sierpinski Gasket
//
// First, initialize the vertices of our 3D gasket
// Four vertices on unit circle
// Intial tetrahedron with equal length sides
function createGasket() {
    var vertices = [
        vec3(0.0, 0.0, -0.5),
        vec3(0.0, 0.47, 0.16),
        vec3(-0.4, -0.23, 0.16),
        vec3(0.4, -0.23, 0.16),
    ];

    // Scale down the vertices
    //for (var i = 0; i < vertices.length; ++i) {
    //    vertices[i] = scale(initialScale * 0.5, vertices[i]);
    //}

    divideTetra(
        vertices[0],
        vertices[1],
        vertices[2],
        vertices[3],

        NumTimesToSubdivide
    );
}

function triangle(a, b, c, color) {
    // add colors and vertices for one triangle

    var baseColors = [
        vec3(1.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0),
        vec3(0.0, 0.0, 1.0),
        vec3(0.5, 0.5, 0.5),
    ];

    colors.push(baseColors[color]);
    points.push(a);
    colors.push(baseColors[color]);
    points.push(b);
    colors.push(baseColors[color]);
    points.push(c);
}

function tetra(a, b, c, d) {
    // tetrahedron with each side using
    // a different color

    triangle(a, c, b, 0);
    triangle(a, c, d, 1);
    triangle(a, b, d, 2);
    triangle(b, c, d, 3);
}

function divideTetra(a, b, c, d, count) {
    // check for end of recursion

    if (count === 0) {
        tetra(a, b, c, d);
    }

    // find midpoints of sides
    // divide four smaller tetrahedra
    else {
        var ab = mix(a, b, 0.5);
        var ac = mix(a, c, 0.5);
        var ad = mix(a, d, 0.5);
        var bc = mix(b, c, 0.5);
        var bd = mix(b, d, 0.5);
        var cd = mix(c, d, 0.5);

        --count;

        divideTetra(a, ab, ac, ad, count);
        divideTetra(ab, b, bc, bd, count);
        divideTetra(ac, bc, c, cd, count);
        divideTetra(ad, bd, cd, d, count);
    }
}

function disableInput() {
    // document.getElementById("subdivision-range").disabled = true;
    // document.getElementById("speed-range").disabled = true;
    // document.getElementById("start").disabled = true;
    // document.getElementById("reset").disabled = true;
    document.getElementById("stop").disabled = false; // Disable all input except "stop" button
}

function enableInput() {
    document.getElementById("subdivision-range").disabled = false;
    document.getElementById("speed-range").disabled = false;
    document.getElementById("start").disabled = false;
    document.getElementById("reset").disabled = false;
    document.getElementById("stop").disabled = true; // Enable all input except "stop" button
}

function startAnimation() {
    gl.clearColor(0.8, 0.8, 0.8, 1.0); // Set the background color to gray
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear color and depth buffer

    if (!stop) {
        // Rotate right 180 degree
        if (time < 90) {
            theta[axis] -= 2.0 * speed;
            time = time + 1 * speed;
        }
        // Rotate left back to original orientation and left 180 degree
        else if (time >= 90 && time < 270) {
            theta[axis] += 2.0 * speed;
            time = time + 1 * speed;
        }
        // Rotate right back to original orientation
        else if (time >= 270 && time < 360) {
            theta[axis] -= 2.0 * speed;
            time = time + 1 * speed;
        }
        // Enlarge scale to appropriate size
        else if (time >= 360 && time < 420) {
            scale[0] += 0.01 * speed;
            scale[1] += 0.01 * speed;
            scale[2] += 0.01 * speed;
            gl.uniform3fv(scaleLoc, scale);
            time = time + 1 * speed;
        }
        // Rescale back to original size
        else if (time >= 420 && time < 480) {
            scale[0] -= 0.01 * speed;
            scale[1] -= 0.01 * speed;
            scale[2] -= 0.01 * speed;
            gl.uniform3fv(scaleLoc, scale);
            time = time + 1 * speed;
        }
        // Random movement
        else {
            theta[0] += 0.5 * speed;
            theta[1] += 0.5 * speed;
            theta[2] += 0.5 * speed;
            time = time + 1 * speed;
        }

        // Stop animation when canvas is clicked
        document.getElementById("gl-canvas").onclick = function () {
            document.getElementById("stop").click();
        };
    }
    gl.uniform3fv(thetaLoc, theta);
    gl.drawArrays(gl.TRIANGLES, 0, points.length);
    requestAnimFrame(startAnimation);
}

function render() {
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, points.length);
}
