var canvas;
var gl;

var points = [];
var colors = [];
var baseColors = [
    vec4(1.0, 0.0, 0.0, 1.0),
    vec4(0.0, 1.0, 0.0, 1.0),
    vec4(0.0, 0.0, 1.0, 1.0),
    vec4(0.0, 0.0, 0.0, 1.0),
];

var initialScale = 1;
var NumTimesToSubdivide = 3;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    // Event listener for subdivision slider
    var subdivision = document.getElementById("subdivision");

    subdivision.addEventListener("input", function() {
        NumTimesToSubdivide = subdivision.value;
        console.log(subdivision.value);
        document.getElementById("subdivisionValue").textContent = this.value;
        renderGasket();
    });


    // Event listener for initial size (scale)
    var scaleInput = document.getElementById("scale");

    scaleInput.addEventListener("input", function() {
        initialScale = scaleInput.value;
        document.getElementById("scaleValue").textContent = this.value;
        renderGasket();
    });

    // Event listener for animation speed
    var speed = document.getElementById("speed");

    speed.addEventListener("input", function() {
        document.getElementById("speedValue").textContent = this.value + "x";
    })



    //Color settings
    var color1 = document.getElementById("color1");
    var intensity1 = document.getElementById("intensity1");

    [color1, intensity1].forEach(function(element) {

        element.addEventListener("input", function() {

            baseColors[0] = hexToVec4(color1.value, intensity1.value);
            renderGasket();
        })
    });

    var color2 = document.getElementById("color2");
    var intensity2 = document.getElementById("intensity2");

    [color2, intensity2].forEach(function(element) {

        element.addEventListener("input", function() {

            baseColors[1] = hexToVec4(color2.value, intensity2.value);
            renderGasket();
        })
    });


    var color3 = document.getElementById("color3");
    var intensity3 = document.getElementById("intensity3");

    [color3, intensity3].forEach(function(element) {

        element.addEventListener("input", function() {

            baseColors[2] = hexToVec4(color3.value, intensity3.value);
            renderGasket();
        })
    });

    var color4 = document.getElementById("color4");
    var intensity4 = document.getElementById("intensity4");

    [color4, intensity4].forEach(function(element) {

        element.addEventListener("input", function() {

            baseColors[3] = hexToVec4(color4.value, intensity4.value);
            renderGasket();
        })
    });
    // Make sure it render again after changing attributes
    renderGasket();
};

function hexToVec4(hex, intensity) {
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    return vec4(r / 255, g / 255, b / 255, intensity);
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
        vec3(0.0, 0.0, -1.0),
        vec3(0.0, 0.9428, 0.3333),
        vec3(-0.5, -0.4714, 0.3333),
        vec3(0.5, -0.4714, 0.3333),
    ];


    divideTetra(
        vertices[0],
        vertices[1],
        vertices[2],
        vertices[3],
        NumTimesToSubdivide
    );

    //
    //  Configure WebGL
    //
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // enable hidden-surface removal

    gl.enable(gl.DEPTH_TEST);

    //  Load shaders and initialize attribute buffers

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Create a buffer object, initialize it, and associate it with the
    //  associated attribute variable in our vertex shader

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    render();
};


function render() {
    gl.clearColor(0.5, 0.5, 0.5, 1.0); // Set the background color to gray
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, points.length);
}

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