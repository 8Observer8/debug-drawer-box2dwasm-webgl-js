import { mat4, vec3 } from "gl-matrix";
import { box2d, initBox2D } from "./init-box2d.js";
import { gl, initWebGLContext } from "./webgl-context.js";
import createShaderProgram from "./shader-program.js";
import DebugDrawer from "./debug-drawer.js";

let debugDrawer, world;
const pixelsPerMeter = 30;

const groundColor = vec3.fromValues(0.77, 0.37, 0.06);
const groundPosition = vec3.fromValues(100, 15, 0);
const groundSize = vec3.fromValues(190, 19, 1);

const boxColor = vec3.fromValues(0.1, 0.3, 0.9);
const boxPosition = vec3.fromValues(100, 150, 0);
const boxStartAngle = 40;
const boxSize = vec3.fromValues(20, 20, 1);
let boxBody;

let program, uColorLocation, uMvpMatrixLocation;

const projMatrix = mat4.create();
mat4.ortho(projMatrix, 0, 200, 0, 200, 1, -1);

const viewMatrix = mat4.create();
mat4.lookAt(viewMatrix, [0, 0, 1], [0, 0, 0], [0, 1, 0]);

const projViewMatrix = mat4.create();
mat4.mul(projViewMatrix, projMatrix, viewMatrix);

const modelMatrix = mat4.create();
const mvpMatrix = mat4.create();

const maxTimeStepMs = 1 / 60 * 1000;
function step(deltaMs) {
    const clampedDeltaMs = Math.min(deltaMs, maxTimeStepMs);
    world.Step(clampedDeltaMs / 1000, 3, 2);
}

function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Ground
    mat4.fromTranslation(modelMatrix, groundPosition);
    mat4.scale(modelMatrix, modelMatrix, groundSize);
    mat4.mul(mvpMatrix, projViewMatrix, modelMatrix);
    gl.uniformMatrix4fv(uMvpMatrixLocation, false, mvpMatrix);
    gl.uniform3fv(uColorLocation, groundColor);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Box
    const position = boxBody.GetPosition();
    boxPosition[0] = position.x * pixelsPerMeter;
    boxPosition[1] = position.y * pixelsPerMeter;
    mat4.fromTranslation(modelMatrix, boxPosition);
    mat4.rotateZ(modelMatrix, modelMatrix, boxBody.GetAngle());
    mat4.scale(modelMatrix, modelMatrix, boxSize);
    mat4.mul(mvpMatrix, projViewMatrix, modelMatrix);
    gl.uniformMatrix4fv(uMvpMatrixLocation, false, mvpMatrix);
    gl.uniform3fv(uColorLocation, boxColor);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Draw colliders
    world.DebugDraw();
}

async function init() {
    if (!initWebGLContext("renderCanvas")) return;
    await initBox2D();
    const {
        b2_dynamicBody,
        b2BodyDef,
        b2PolygonShape,
        b2Vec2,
        b2World
    } = box2d;

    gl.clearColor(0.2, 0.2, 0.2, 1);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    program = await createShaderProgram("assets/shaders/",
        "default.vert", "default.frag");

    uMvpMatrixLocation = gl.getUniformLocation(program, "uMvpMatrix");
    uColorLocation = gl.getUniformLocation(program, "uColor");

    const vertPositions = [
        -0.5, -0.5,
        0.5, -0.5,
        -0.5, 0.5,
        0.5, 0.5
    ];
    const vertPosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPositions),
        gl.STATIC_DRAW);

    const aPositionLocation = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPositionLocation);

    world = new b2World();
    const gravity = new b2Vec2(0, -3);
    world.SetGravity(gravity);

    debugDrawer = new DebugDrawer(program, pixelsPerMeter);
    debugDrawer.projMatrix = projMatrix;
    debugDrawer.viewMatrix = viewMatrix;
    world.SetDebugDraw(debugDrawer.instance);

    // Ground
    const groundBodyDef = new b2BodyDef();
    groundBodyDef.set_position(new b2Vec2(groundPosition[0] / pixelsPerMeter,
        groundPosition[1] / pixelsPerMeter));
    const groundBody = world.CreateBody(groundBodyDef);
    const groundShape = new b2PolygonShape();
    groundShape.SetAsBox(groundSize[0] / 2 / pixelsPerMeter,
        groundSize[1] / 2 / pixelsPerMeter);
    groundBody.CreateFixture(groundShape, 0);

    // Box
    const boxBodyDef = new b2BodyDef();
    boxBodyDef.set_position(new b2Vec2(boxPosition[0] / pixelsPerMeter,
        boxPosition[1] / pixelsPerMeter));
    boxBodyDef.angle = boxStartAngle * Math.PI / 180;
    boxBodyDef.type = b2_dynamicBody;
    console.log(boxBodyDef);
    boxBody = world.CreateBody(boxBodyDef);
    const boxShape = new b2PolygonShape();
    boxShape.SetAsBox(boxSize[0] / 2 / pixelsPerMeter,
        boxSize[1] / 2/ pixelsPerMeter);
    boxBody.CreateFixture(boxShape, 1);

    (function animationLoop(prevMs) {
        const nowMs = window.performance.now()
        window.requestAnimationFrame(animationLoop.bind(null, nowMs));
        const deltaMs = nowMs - prevMs;
        step(deltaMs);
        draw();
    })(window.performance.now());
}

init();
