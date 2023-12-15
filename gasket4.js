var canvas;
var gl;

var points = [];
var colors = [];
var baseColors = [
    vec3(1.0, 0.0, 0.0),
    vec3(0.0, 1.0, 0.0),
    vec3(0.0, 0.0, 1.0),
    vec3(0.0, 0.0, 0.0),
];
var bgRed = 0.8;
var bgGreen = 0.8;
var bgBlue = 0.8;

var NumTimesToSubdivide = 3; // default subdivision
var scaleLoc; // scale location
var scale = 1; // default scale

var speed = 1;
var axis = 1; //(x=0, y=1, z=2)
var theta = [0, 0, 0];
var thetaLoc;
var transform = [0, 0];
var transformLoc;
var left = true;
var up = true;

var hBoundary = 0.6;
var topBoundary = 0.52;
var bottomBoundary = -0.76;

var time = 0;
var stop = true;

var cBuffer;
var vBuffer;
var vColor;
var vPosition;

function recalcBoundary() {
    hBoundary = 0.6 - 0.4 * (scale - 1);
    topBoundary = 0.52 - 0.5 * (scale - 1);
    bottomBoundary = -0.76 + 0.2 * (scale - 1);
}

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    // Parameters
    // Speed
    document.getElementById("speed").onchange = function () {
        speed = document.getElementById("speed").value;
        document.getElementById("speedValue").textContent = speed + "x";
    };

    // Reset attributes
    document.getElementById("reset-attr").onclick = function () {
        location.reload();
    };

    // Animation control
    document.getElementById("start-stop").onclick = function () {
        render();
        stop = !stop;
        if (!stop) {
            if (time == 0) {
                startAnimation();
            }
            document.getElementById("start-stop").innerHTML = "Stop";
        } else {
            document.getElementById("start-stop").innerHTML = "Start";
        }
    };

    // Reset animation
    document.getElementById("reset").onclick = function () {
        // Click stop button if animation is running
        if (!stop) {
            document.getElementById("start-stop").click();
        }
        points = [];
        colors = [];
        theta = [0, 0, 0];
        transform = [0, 0];
        scale = 1;
        renderGasket();
    };

    // Start animation when canvas is clicked
    document.getElementById("gl-canvas").onclick = function () {
        document.getElementById("start-stop").click();
    };

    // Event listener for subdivision slider
    var subdivision = document.getElementById("subdivision");

    subdivision.addEventListener("input", function () {
        NumTimesToSubdivide = subdivision.value;
        document.getElementById("subdivisionValue").textContent = this.value;
        renderGasket();
    });

    // Event listener for initial size (scale)
    var scaleInput = document.getElementById("scale");

    scaleInput.addEventListener("input", function () {
        scale = scaleInput.value;
        document.getElementById("scaleValue").textContent = this.value;
        recalcBoundary();
        renderGasket();
    });

    // Color settings
    var color1 = document.getElementById("color1");
    var intensity1 = document.getElementById("intensity1");

    [color1, intensity1].forEach(function (element) {
        element.addEventListener("input", function () {
            baseColors[0] = hexToVec3(color1.value, intensity1.value);
            renderGasket();
        });
    });

    var color2 = document.getElementById("color2");
    var intensity2 = document.getElementById("intensity2");

    [color2, intensity2].forEach(function (element) {
        element.addEventListener("input", function () {
            baseColors[1] = hexToVec3(color2.value, intensity2.value);
            renderGasket();
        });
    });

    var color3 = document.getElementById("color3");
    var intensity3 = document.getElementById("intensity3");

    [color3, intensity3].forEach(function (element) {
        element.addEventListener("input", function () {
            baseColors[2] = hexToVec3(color3.value, intensity3.value);
            renderGasket();
        });
    });

    var color4 = document.getElementById("color4");
    var intensity4 = document.getElementById("intensity4");

    [color4, intensity4].forEach(function (element) {
        element.addEventListener("input", function () {
            baseColors[3] = hexToVec3(color4.value, intensity4.value);
            renderGasket();
        });
    });

    // Background color settings
    var bgColor = document.getElementById("bgColor");

    bgColor.addEventListener("input", function () {
        bgRed = parseInt(bgColor.value.substr(1, 2), 16) / 255;
        bgGreen = parseInt(bgColor.value.substr(3, 2), 16) / 255;
        bgBlue = parseInt(bgColor.value.substr(5, 2), 16) / 255;

        baseColors[0] = hexToVec3(color1.value, intensity1.value);
        baseColors[1] = hexToVec3(color2.value, intensity2.value);
        baseColors[2] = hexToVec3(color3.value, intensity3.value);
        baseColors[3] = hexToVec3(color4.value, intensity4.value);

        renderGasket();
    });

    // Make sure it render again after changing attributes
    renderGasket();
};

function hexToVec3(hex, intensity) {
    const r =
        parseInt(hex.substr(1, 2), 16) * intensity +
        bgRed * 255 * (1 - intensity);
    const g =
        parseInt(hex.substr(3, 2), 16) * intensity +
        bgGreen * 255 * (1 - intensity);
    const b =
        parseInt(hex.substr(5, 2), 16) * intensity +
        bgBlue * 255 * (1 - intensity);
    return vec3(r / 255, g / 255, b / 255);
}

function renderGasket() {
    // Clear the points
    points = [];
    colors = [];

    //
    //  Initialize our data for the Sierpinski Gasket
    //

    // First, initialize the vertices of our 3D gasket
    // Four vertices on unit circle
    // Intial tetrahedron with equal length sides

    var vertices = [
        vec3(0.0, 0.0, -0.5),
        vec3(0.0, 0.47, 0.16),
        vec3(-0.4, -0.23, 0.16),
        vec3(0.4, -0.23, 0.16),
    ];

    divideTetra(
        vertices[0],
        vertices[1],
        vertices[2],
        vertices[3],
        NumTimesToSubdivide - 1
    );

    //
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
    transformLoc = gl.getUniformLocation(program, "transform");
    gl.uniform1f(scaleLoc, scale);

    render();
}

//
//  Initialize our data for the Sierpinski Gasket
//
// First, initialize the vertices of our 3D gasket
// Four vertices on unit circle
// Intial tetrahedron with equal length sides

function triangle(a, b, c, color) {
    // add colors and vertices for one triangle
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

    if (count < 0) {
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

function startAnimation() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear color and depth buffer

    if (!stop) {
        if (time < 480) document.getElementById("speed").disabled = true;
        // Rotate right 180 degree
        if (time < 90) {
            theta[axis] -= 2.0 * speed;
        }
        // Rotate left back to original orientation and left 180 degree
        else if (time >= 90 && time < 270) {
            theta[axis] += 2.0 * speed;
        }
        // Rotate right back to original orientation
        else if (time >= 270 && time < 360) {
            theta[axis] -= 2.0 * speed;
        }
        // Enlarge scale to appropriate size
        else if (time >= 360 && time < 420) {
            scale = parseFloat(scale) + 0.01 * speed;
            gl.uniform1f(scaleLoc, scale);
        }
        // Rescale back to original size
        else if (time >= 420 && time < 480) {
            scale = parseFloat(scale) - 0.01 * speed;
            gl.uniform1f(scaleLoc, scale);
        }
        // Random movement
        else {
            document.getElementById("speed").disabled = false;
            if (transform[0] > hBoundary) {
                left = true;
                // If there are still spaces below, move down
                if (transform[1] > bottomBoundary) {
                    up = false;
                } else if (transform[1] < bottomBoundary) {
                    up = true;
                }
            } else if (transform[0] < -hBoundary) {
                left = false;
                // If there are still spaces above, move up
                if (transform[1] < topBoundary) {
                    up = true;
                } else if (transform[1] > topBoundary) {
                    up = false;
                }
            } else if (transform[1] > topBoundary) {
                up = false;
                // If there are still spaces on the right, move right
                if (transform[0] < -hBoundary) {
                    left = false;
                } else if (transform[0] > hBoundary) {
                    left = true;
                }
            } else if (transform[1] < bottomBoundary) {
                up = true;
                // If there are still spaces on the right, move right
                if (transform[0] < -hBoundary) {
                    left = false;
                } else if (transform[0] > hBoundary) {
                    left = true;
                }
            }

            // Move to the left and right
            if (left) {
                transform[0] -= 0.01 * speed;
            } else {
                transform[0] += 0.01 * speed;
            }

            // Move up and down
            if (up) {
                transform[1] += 0.01 * speed;
            } else {
                transform[1] -= 0.01 * speed;
            }
            gl.uniform2fv(transformLoc, transform);
        }
        time = time + 1 * speed;

        // Stop animation when canvas is clicked
        document.getElementById("gl-canvas").onclick = function () {
            document.getElementById("start-stop").click();
        };
    }
    gl.uniform3fv(thetaLoc, theta);
    gl.drawArrays(gl.TRIANGLES, 0, points.length);
    requestAnimFrame(startAnimation);
}

function render() {
    gl.clearColor(bgRed, bgGreen, bgBlue, 1.0); // Set the background color to gray
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
