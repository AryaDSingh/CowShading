//shader.js
let gl;
let canvas;
let program;
let points = [];
let indices = [];
let cow = [];
let normals = []; // Array to store vertex normals
let angle = 0;
let copy_angle = 0;
let scale1;
let trans1;
let trans2;
let status;
let rotation1;
let rotation2;
let p_x = 0;
let copy_lx = 0;
let p_y = 0;
let stop_light_rotating = false;
let stop_light_panning = false;
let panSpotlight = true;
let angleSpotlight = 0;
let anglePanning = 0;

let spotlightX = 0;
let spotlightY = 6;
let spotlightZ = 6;
let spotlightDirectionX = 0;
let spotlightDirectionY = -1;
let spotlightDirectionZ = -1;
let spotlightPos = vec3(0, 6, 6);
let spotlightDirection = vec3(0, 0, -1);


window.onload = function init() {
  
  function generateWireframeConeVertices(radius, height, segments) {
    const vertices = [];
    const indices = [];
  
    const halfHeight = height * 0.5;
    vertices.push(vec3(0, 0, halfHeight)); // Apex of the cone
  
    // Generate base vertices of the cone
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      vertices.push(vec3(x, y, -halfHeight));
    }
  
    // Generate indices for drawing wireframe lines
    for (let i = 1; i <= segments; i++) {
      indices.push(0, i, i % segments + 1);
    }
  
    return { vertices, indices };
  }

  const coneRadius = 1.5;
  const coneHeight = 3;
  const coneSegments = 30;
  const { vertices: coneVertices, indices: coneIndices } = generateWireframeConeVertices(
    coneRadius,
    coneHeight,
    coneSegments
  );

  const cowVertices = get_vertices();
  const cowIndices = get_faces();
  cowVertices.push(...coneVertices);
  cowIndices.push(...coneIndices.map(i => i + cowVertices.length));


 

  scale1 = document.getElementById("scale1");
  trans1 = document.getElementById("trans1");
  trans2 = document.getElementById("trans2");
  status = document.getElementById("status");
  rotation1 = document.getElementById("rotation1");
  rotation2 = document.getElementById("rotation2");

  canvas = document.getElementById("gl-canvas");
  canvas.focus();
  let isDragging = false;
  let dragStart;
  let dragEnd;

  canvas.addEventListener("wheel", ({ deltaY }) => {
    if (deltaY < 0) {
      scale1.value = parseFloat(scale1.value) + 0.05;
    } else if (deltaY > 0) {
      scale1.value = parseFloat(scale1.value) - 0.05;
    }
  });

  canvas.addEventListener("mousedown", ({ which, pageX, pageY }) => {
    switch (which) {
      case 1:
      case 3:
        dragStart = {
          x: pageX,
          y: pageY
        };
        isDragging = true;
        break;
    }
  });

  canvas.addEventListener("mousemove", ({ which, clientX, clientY }) => {
    switch (which) {
      case 1:
        p_x = (2 * clientX) / canvas.width - 1;
        p_y = (2 * (canvas.height - clientY)) / canvas.height - 1;
        if (isDragging) {
          dragEnd = {
            x: p_x,
            y: p_y
          };
          trans1.value = p_x.toFixed(2);
          trans2.value = p_y.toFixed(2);
          dragStart = dragEnd;
        }
        break;
      case 3:
        p_x = (2 * clientX) / canvas.width - 1;
        p_y = (2 * (canvas.height - clientY)) / canvas.height - 1;

        if (isDragging) {
          dragEnd = {
            x: p_x * 180,
            y: p_y * 180
          };
          rotation1.value = dragEnd.x.toFixed(2);
          rotation2.value = dragEnd.y.toFixed(2);
          dragStart = dragEnd;
        }

        break;
    }
  });


  canvas.addEventListener("mouseup", event => {
    isDragging = false;
  });

  window.addEventListener("keydown", ({ keyCode }) => {
    switch (keyCode) {
      case 37:
        // Left arrow key
        trans1.value = (parseFloat(trans1.value) - 0.05).toFixed(2);
        break;
      case 39:
        // Right arrow key
        trans1.value = (parseFloat(trans1.value) + 0.05).toFixed(2);
        break;
      case 82:
        // R key
        rotation1.value = 0;
        rotation2.value = 0;
        break;
    }
  });
 


  window.addEventListener("keypress", ({ which }) => {
    switch (which) {
      case 114:
        // R key: Reset
        rotation1.value = 0;
        rotation2.value = 0;
        scale1.value = 0.15;
        trans1.value = -0.1;
        trans2.value = 0.1;
        break;
      case 112:
        // P key: Toggle light rotation
        stop_light_rotating = !stop_light_rotating;
        copy_angle = angle;

        break;
      case 115:
        // S key: Toggle light panning
        stop_light_panning = !stop_light_panning;
        copy_lx = p_x;
        break;
    }
  });

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1.0);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  indices = get_faces();
  points = get_vertices();

  for (let i = 0; i < indices.length; i++) {
    for (let j = 0; j < 3; j++) {
      cow.push(points[indices[i][j] - 1]);
    }
  }

  // Compute vertex normals
  computeVertexNormals();

  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  const vertexNormal = gl.getAttribLocation(program, "vNormal");
  const vertexPosition = gl.getAttribLocation(program, "vPosition");

  const normBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
  gl.vertexAttribPointer(vertexNormal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vertexNormal);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(cow), gl.STATIC_DRAW);
  gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vertexPosition);

  window.requestAnimationFrame(animate);
};

function setUniform3f(prog, name, x, y, z) {
  const position = gl.getUniformLocation(prog, name);
  gl.uniform3f(position, x, y, z);
}
function computeVertexNormals() {
  // Clear existing normals
  normals = [];

  // Initialize an array to store the vertex normals
  const vertexNormals = new Array(points.length).fill(vec3(0, 0, 0));

  // Compute face normals and accumulate them into vertexNormals
  for (let i = 0; i < indices.length; i++) {
    const v1Index = indices[i][0] - 1;
    const v2Index = indices[i][1] - 1;
    const v3Index = indices[i][2] - 1;

    const v1 = vec3(cow[i * 3]);
    const v2 = vec3(cow[i * 3 + 1]);
    const v3 = vec3(cow[i * 3 + 2]);

    const e1 = subtract(v2, v1);
    const e2 = subtract(v3, v1);
    const faceNormal = normalize(cross(e1, e2));

    // Accumulate the face normal into the corresponding vertices' normal
    vertexNormals[v1Index] = add(vertexNormals[v1Index], faceNormal);
    vertexNormals[v2Index] = add(vertexNormals[v2Index], faceNormal);
    vertexNormals[v3Index] = add(vertexNormals[v3Index], faceNormal);
  }

  // Normalize the vertex normals
  for (let i = 0; i < vertexNormals.length; i++) {
    vertexNormals[i] = normalize(vertexNormals[i]);
  }

  // Assign the smoothed vertex normals to the normals array
  for (let i = 0; i < indices.length; i++) {
    const v1Index = indices[i][0] - 1;
    const v2Index = indices[i][1] - 1;
    const v3Index = indices[i][2] - 1;

    const v1Normal = vertexNormals[v1Index];
    const v2Normal = vertexNormals[v2Index];
    const v3Normal = vertexNormals[v3Index];

    // Assign the vertex normals for each vertex of the face
    normals.push(v1Normal);
    normals.push(v2Normal);
    normals.push(v3Normal);
  }
}


function animate() {
  
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (stop_light_rotating) {
    anglePanning = copy_angle;
  } else {
    anglePanning += 0.2; // Adjust the panning speed here
  }


  if (!stop_light_panning) {
    // Calculate the spotlight angle to oscillate between -45 and 45 degrees
    const oscillationRangeX = 45;
    const oscillationRangeY = 30;
    const spotlightAngleX = oscillationRangeX * Math.sin((angleSpotlight * Math.PI) / 180);
    const spotlightAngleY = oscillationRangeY * Math.sin((angleSpotlight * Math.PI) / 180);

    spotlightX = 6 * Math.sin((spotlightAngleX * Math.PI) / 180); // Auto panning from left to right and back
    spotlightZ = 6 * Math.cos((spotlightAngleY * Math.PI) / 180);

    // Update spotlight direction based on the current spotlight position
    spotlightDirectionX = -spotlightX;
    spotlightDirectionY = spotlightY - 6;
    spotlightDirectionZ = -spotlightZ;

    spotlightY = -8;

    // Increment the spotlight angle
    angleSpotlight += 0.2; // Adjust the spotlight rotation speed here
  }
  

  const rotate1 = rotateX(rotation1.value);
  const rotate2 = rotateY(rotation2.value);
  const s1 = scalem(scale1.value, scale1.value, scale1.value);
  const trans = translate(trans1.value, trans2.value, 0);
  const mat = mult(trans, mult(s1, mult(rotate2, rotate1)));

  const normalMatrix = inverse(transpose(mat3(mat)));

  const position = gl.getUniformLocation(program, "mat");
  gl.uniformMatrix4fv(position, false, flatten(mat));

  const normMatrix = gl.getUniformLocation(program, "normalMatrix");
  gl.uniformMatrix3fv(normMatrix, false, flatten(normalMatrix));

  const rotationSpeedConstant = 10;

  const x = Math.cos((Math.PI * anglePanning * rotationSpeedConstant) / 180.0);
  const y = Math.sin((Math.PI * anglePanning * rotationSpeedConstant) / 180.0);

  const gx = Math.cos((Math.PI * p_x * rotationSpeedConstant) / 180.0);

  spotlightPos = vec3(spotlightX, spotlightY, spotlightZ);
  setUniform3f(program, "panning_spotlightDir", spotlightDirectionX, spotlightDirectionY, spotlightDirectionZ);
  setUniform3f(program, "lightPos", spotlightX, spotlightY, spotlightZ);
  setUniform3f(program, "lightDir", x, y, 0.0);
  setUniform3f(program, "lightColorMat", 0.2, 1, 0.0);
  setUniform3f(program, "lightColor", 0.8, 0.5, 0.3);
  setUniform3f(program, "ambientColor", 0.113, 0.126, 0.216);
  setUniform3f(program, "surfaceSpec", 0.2, 0.2, 0.2);
  setUniform3f(program, "surfaceSpecMat", 0.8, 0.8, 0.8);
  setUniform3f(program, "surfaceDiffuse", 0.8, 0.6, 0.4);

  
  gl.drawArrays(gl.TRIANGLES, 0, cow.length);

  window.requestAnimationFrame(animate);
}
