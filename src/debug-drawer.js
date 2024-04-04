import { box2d } from "./init-box2d.js";
import { mat4, quat, vec3 } from "gl-matrix";
import { gl } from "./webgl-context.js";

const sizeOfB2Vec = Float32Array.BYTES_PER_ELEMENT * 2;

export default class DebugDrawer {
    constructor (program, pixelsPerMeter) {
        this.program = program;
        this.pixelsPerMeter = pixelsPerMeter;
        this.uMvpMatrixLocation = gl.getUniformLocation(program, "uMvpMatrix");
        this.uColorLocation = gl.getUniformLocation(program, "uColor");
        this.mvpMatrix = mat4.create();
        this.modelMatrix = mat4.create();
        this.projMatrix = null;
        this.viewMatrix = null;
        this.projViewMatrix = mat4.create();
        this.lineWidth = 2;
        this.centerX = 0;
        this.centerY = 0;
        this.tempVec = vec3.create();
        this.fromX = 0;
        this.fromY = 0;
        this.toX = 0;
        this.toY = 0;
        this.length = 0;
        this.position = vec3.create();
        this.rotation = quat.create();
        this.scale = vec3.create();
        this.color = vec3.create();
        this.unitX = vec3.fromValues(1, 0, 0);

        const {
            b2Color,
            b2Draw: { e_shapeBit },
            b2Vec2,
            JSDraw,
            wrapPointer
        } = box2d;

        const reifyArray = (array_p, numElements, sizeOfElement, ctor) =>
            Array(numElements)
                .fill(undefined)
                .map((_, index) =>
                    wrapPointer(array_p + index * sizeOfElement, ctor)
                );

        self = this;
        const debugDrawer = Object.assign(new JSDraw(), {
            DrawSegment(vert1_p, vert2_p, color_p) {},
            DrawPolygon(vertices_p, vertexCount, color_p) {},
            DrawSolidPolygon(vertices_p, vertexCount, color_p) {
                const color = wrapPointer(color_p, b2Color);
                const vertices = reifyArray(vertices_p, vertexCount,
                    sizeOfB2Vec, b2Vec2);
                mat4.mul(self.projViewMatrix, self.projMatrix, self.viewMatrix);
                gl.uniform3f(self.uColorLocation, color.r, color.g, color.b);
                self.drawLine(vertices[0], vertices[1]);
                self.drawLine(vertices[1], vertices[2]);
                self.drawLine(vertices[2], vertices[3]);
                self.drawLine(vertices[3], vertices[0]);
            },
            DrawCircle(center_p, radius, color_p) {},
            DrawSolidCircle(center_p, radius, axis_p, color_p) {},
            DrawTransform(transform_p) {},
            DrawPoint(vertex_p, sizeMetres, color_p) {}
        });
        debugDrawer.SetFlags(e_shapeBit);
        this.instance = debugDrawer;
    }

    drawLine(pointA, pointB) {
        this.fromX = pointA.x * this.pixelsPerMeter;
        this.fromY = pointA.y * this.pixelsPerMeter;
        this.toX = pointB.x * this.pixelsPerMeter;
        this.toY = pointB.y * this.pixelsPerMeter;
        if (this.fromX > this.toX) {
            this.centerX = this.toX + Math.abs(this.fromX - this.toX) / 2;
        }
        else {
            this.centerX = this.fromX + Math.abs(this.toX - this.fromX) / 2;
        }
        if (this.fromY > this.toY) {
            this.centerY = this.toY + Math.abs(this.fromY - this.toY) / 2;
        }
        else {
            this.centerY = this.fromY + Math.abs(this.toY - this.fromY) / 2;
        }
        this.tempVec[0] = this.toX - this.fromX;
        this.tempVec[1] = this.toY - this.fromY;
        this.length = vec3.length(this.tempVec);
        vec3.normalize(this.tempVec, this.tempVec);

        this.position[0] = this.centerX;
        this.position[1] = this.centerY;
        this.position[2] = 0;
        quat.rotationTo(this.rotation, this.unitX, this.tempVec);
        this.scale[0] = this.length;
        this.scale[1] = this.lineWidth;
        this.scale[2] = 1;
        mat4.fromRotationTranslationScale(this.modelMatrix, this.rotation,
            this.position, this.scale);
        mat4.mul(this.mvpMatrix, this.projViewMatrix, this.modelMatrix);
        gl.uniformMatrix4fv(this.uMvpMatrixLocation, false, this.mvpMatrix);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}
