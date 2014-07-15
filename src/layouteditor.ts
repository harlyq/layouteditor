// Copyright 2014 Reece Elliott

/// <reference path="interactionhelper.ts" />
module LayoutEditor {
    "use strict";

    var EPSILON = 0.001;
    var g_canvas = null;
    var g_ctx = null;
    var g_div = null;
    var g_toolCanvas = null;
    var g_toolCtx = null;

    function assert(cond: boolean) {
        if (!cond)
            debugger;
    }

    function extend(obj: any, props: any): any {
        if (!obj)
            obj = {};
        for (var key in props) {
            if (props.hasOwnProperty(key)) {
                if (typeof props[key] === "object") {
                    extend(obj[key], props[key]);
                } else {
                    obj[key] = props[key];
                }
            }
        }
        return obj;
    }

    function arrayMin(list: number[], offset: number = 0, stride: number = 1): number {
        if (list.length <= offset)
            return 0;

        var min = list[offset];
        for (var i: number = offset + stride; i < list.length; i += stride) {
            var val = list[i];
            if (val < min)
                min = val;
        }
        return min;
    }

    function arrayMax(list: number[], offset: number = 0, stride: number = 1): number {
        if (list.length <= offset)
            return 0;

        var max = list[offset];
        for (var i: number = offset + stride; i < list.length; i += stride) {
            var val = list[i];
            if (val > max)
                max = val;
        }
        return max;
    }

    function insertSortedUnique(list: number[], value: number) {
        var numList: number = list.length;
        if (numList === 0)
            return list.splice(0, 0, value);

        var i: number = 0;
        var j: number = numList - 1;
        var mid: number = 0;
        var midValue: number = 0;
        do {
            mid = (i + j) >> 1;
            midValue = list[mid];
            if (value === midValue)
                return; // value already in the list

            if (value < midValue) {
                j = mid - 1;
            } else {
                i = mid + 1;
            }
        } while (i <= j);

        if (value < midValue)
            list.splice(mid, 0, value);
        else
            list.splice(mid + 1, 0, value);
    }

    function getIndexOfSorted(list: number[], value: number): number {
        var numList: number = list.length;
        if (numList === 0)
            return -1;

        var i: number = 0;
        var j: number = numList - 1;
        var mid: number = 0;
        var midValue: number = 0;
        do {
            mid = (i + j) >> 1;
            midValue = list[mid];
            if (value === midValue)
                return mid; // found the value

            if (value < midValue) {
                j = mid - 1;
            } else {
                i = mid + 1;
            }
        } while (i <= j);

        return mid;
    }

    //------------------------------
    class Style {
        strokeStyle: string = "black";
        fillStyle: string = "white";
        lineWidth: number = 1;
        lineDash: number[] = [];

        draw(ctx) {
            if (ctx.strokeStyle !== this.strokeStyle)
                ctx.strokeStyle = this.strokeStyle;
            if (ctx.fillStyle !== this.fillStyle)
                ctx.fillStyle = this.fillStyle;
            if (ctx.lineWidth !== this.lineWidth.toString())
                ctx.lineWidth = this.lineWidth.toString();
            ctx.setLineDash(this.lineDash);
        }
    }
    var g_defaultStyle: Style = new Style();
    var g_drawStyle: Style = new Style();
    var g_selectStyle: Style = new Style();
    g_drawStyle.strokeStyle = "red";
    g_drawStyle.lineDash = [2, 2];
    g_drawStyle.fillStyle = "none";
    g_selectStyle.strokeStyle = "blue";
    g_selectStyle.lineDash = [5, 5];
    g_selectStyle.fillStyle = "none"

    var g_style: Style = g_defaultStyle;


    //------------------------------
    class Bounds {
        rotate: number = 0; // radians
        cx: number;
        cy: number;
        hw: number; // halfWidth
        hh: number; // halfHeight

        constructor() {}

        toPolygon(): number[] {
            var cr = Math.cos(this.rotate);
            var sr = Math.sin(this.rotate);

            var polygon: number[] = [-this.hw, -this.hh, this.hw, -this.hh, this.hw, this.hh, -this.hw, this.hh];
            for (var i: number = 0; i < polygon.length; i += 2) {
                var x = polygon[i];
                var y = polygon[i + 1];
                polygon[i] = x * cr - y * sr + this.cx;
                polygon[i + 1] = x * sr + y * cr + this.cy;
            }

            return polygon;
        }
    }

    function drawPolygon(ctx, polygon: number[]) {
        if (polygon.length < 4)
            return;

        ctx.strokeStyle = "green";
        ctx.moveTo(polygon[0], polygon[1]);
        for (var i = 2; i < polygon.length; i += 2) {
            ctx.lineTo(polygon[i], polygon[i + 1]);
        }
        ctx.lineTo(polygon[0], polygon[1]);
        ctx.stroke();
    }


    //------------------------------
    interface XY {
        x: number;
        y: number;
    }

    //------------------------------
    class Transform {
        rotate: number = 0;
        scale: XY = {
            x: 1,
            y: 1
        };
        translate: XY = {
            x: 0,
            y: 0
        };

        calc(x: number, y: number): XY {
            var newPos: XY = {
                x: 0,
                y: 0
            };
            var sr: number = Math.sin(this.rotate);
            var cr: number = Math.cos(this.rotate);

            var lx: number = (x - this.translate.x) * this.scale.x;
            var ly: number = (y - this.translate.y) * this.scale.y;
            newPos.x = (lx * cr - ly * sr) + this.translate.x;
            newPos.y = (lx * sr + ly * cr) + this.translate.y;

            return newPos;
        }

        inv(x: number, y: number): XY {
            var newPos: XY = {
                x: 0,
                y: 0
            };

            var sr: number = Math.sin(this.rotate);
            var cr: number = Math.cos(this.rotate);

            newPos.x = x - this.translate.x;
            newPos.y = y - this.translate.y;

            var lx: number = 0;
            var ly: number = 0;

            if (Math.abs(cr) < EPSILON) {
                lx = newPos.y / sr;
                ly = -newPos.x / sr;
            } else if (Math.abs(sr) < EPSILON) {
                lx = newPos.x / cr;
                ly = newPos.y / cr;
            } else {
                lx = (newPos.x * cr + newPos.y * sr) / (cr * cr + sr * sr);
                ly = (newPos.y - lx * sr) / cr;
            }

            lx /= this.scale.x;
            ly /= this.scale.y;

            return {
                x: lx,
                y: ly
            };
        }
    }

    //------------------------------
    class Shape {
        style: Style = g_defaultStyle;
        isDeleted: boolean = false;
        oabb: Bounds = new Bounds();
        aabb: Bounds = new Bounds();
        transform: Transform = new Transform();

        constructor() {}

        setStyle(style: Style) {
            this.style = style;
        }

        draw(ctx) {
            this.style.draw(ctx);

            this.buildPath(ctx);

            if (this.style.fillStyle !== "none")
                ctx.fill();
            ctx.stroke();
        }

        // implemented in the derived class
        public buildPath(ctx) {}

        drawSelect(ctx) {
            var oabb = this.oabb;
            ctx.save();
            ctx.translate(oabb.cx, oabb.cy);
            ctx.rotate(oabb.rotate);
            ctx.strokeRect(-oabb.hw, -oabb.hh, oabb.hw * 2, oabb.hh * 2);
            ctx.restore();
        }

        drawAABB(ctx) {
            var aabb = this.aabb;
            ctx.strokeRect(aabb.cx - aabb.hw, aabb.cy - aabb.hh, aabb.hw * 2, aabb.hh * 2);
        }

        // performed by the derived class
        calculateBounds() {}

        isInsideXY(x: number, y: number): boolean {
            this.buildPath(g_toolCtx);
            return g_toolCtx.isPointInPath(x, y);
        }

        isOverlapBounds(bounds: Bounds): boolean {
            var polygonA: number[] = this.aabb.toPolygon();
            var polygonB: number[] = bounds.toPolygon();

            //drawPolygon(g_toolCtx, polygonA);
            //drawPolygon(g_toolCtx, polygonB);

            for (var i: number = 0; i < 2; ++i) {
                var polygon: number[] = (i === 0 ? polygonA : polygonB);
                var x1: number = polygon[polygon.length - 2];
                var y1: number = polygon[polygon.length - 1];

                for (var j: number = 0; j < polygon.length; j += 2) {
                    var x2: number = polygon[j];
                    var y2: number = polygon[j + 1];
                    var normalX: number = y1 - y2; // -dy
                    var normalY: number = x2 - x1; // dx
                    x1 = x2;
                    y1 = y2;

                    var minA;
                    var maxA;
                    for (var k: number = 0; k < polygonA.length; k += 2) {
                        var projected = normalX * polygonA[k] + normalY * polygonA[k + 1];
                        if (k === 0 || projected < minA) {
                            minA = projected;
                        }
                        if (k === 0 || projected > maxA) {
                            maxA = projected;
                        }
                    }

                    var minB;
                    var maxB;
                    for (var k: number = 0; k < polygonB.length; k += 2) {
                        var projected = normalX * polygonB[k] + normalY * polygonB[k + 1];
                        if (k === 0 || projected < minB) {
                            minB = projected;
                        }
                        if (k === 0 || projected > maxB) {
                            maxB = projected;
                        }
                    }

                    if (maxA < minB || maxB < minA)
                        return false;
                }
            }

            return true;
        }

        copy(base ? : Shape): Shape {
            if (!base)
                base = new Shape();
            extend(base, this);
            return base;
        }
    }

    class RectShape extends Shape {
        constructor(public w: number, public h: number) {
            super();
            this.calculateBounds();
        }

        buildPath(ctx) {
            var transform = this.transform;

            ctx.save();
            // inverse order for ctx
            ctx.translate(transform.translate.x, transform.translate.y);
            ctx.rotate(transform.rotate);
            ctx.scale(transform.scale.x, transform.scale.y);

            ctx.beginPath();
            ctx.rect(-this.w * 0.5, -this.h * 0.5, this.w, this.h);
            ctx.restore();
        }

        copy(base ? : RectShape): RectShape {
            if (!base)
                base = new RectShape(this.w, this.h);
            super.copy(base);
            extend(base, this);
            return base;
        }

        fromRect(x: number, y: number, w: number, h: number) {
            this.transform.translate.x = x + w * 0.5;
            this.transform.translate.y = y + h * 0.5;
            this.w = w;
            this.h = h;
            this.calculateBounds();
        }

        calculateBounds() {
            var transform = this.transform;
            var dx = this.w * 0.5;
            var dy = this.h * 0.5;

            this.oabb.rotate = transform.rotate;
            this.oabb.hw = Math.abs(dx) * transform.scale.x;
            this.oabb.hh = Math.abs(dy) * transform.scale.y;
            this.oabb.cx = transform.translate.x;
            this.oabb.cy = transform.translate.y;

            var polygon: number[] = this.oabb.toPolygon();
            var x1: number = arrayMin(polygon, 0, 2);
            var x2: number = arrayMax(polygon, 0, 2);
            var y1: number = arrayMin(polygon, 1, 2);
            var y2: number = arrayMax(polygon, 1, 2);

            this.aabb.rotate = 0;
            this.aabb.hw = (x2 - x1) * 0.5;
            this.aabb.hh = (y2 - y1) * 0.5;
            this.aabb.cx = (x1 + x2) * 0.5;
            this.aabb.cy = (y1 + y2) * 0.5;
        }
    }

    class EllipseShape extends Shape {
        constructor(public rx: number, public ry: number) {
            super();
            this.calculateBounds();
        }

        buildPath(ctx) {
            var transform = this.transform;
            var rx = Math.abs(this.rx);
            var ry = Math.abs(this.ry);

            ctx.save();
            ctx.translate(transform.translate.x, transform.translate.y);
            ctx.rotate(transform.rotate);
            ctx.scale(transform.scale.x, transform.scale.y);

            var kappa = .5522848,
                ox = rx * kappa, // control point offset horizontal
                oy = ry * kappa; // control point offset vertical

            ctx.beginPath();
            ctx.moveTo(-rx, 0);
            ctx.bezierCurveTo(-rx, -oy, -ox, -ry, 0, -ry);
            ctx.bezierCurveTo(ox, -ry, rx, -oy, rx, 0);
            ctx.bezierCurveTo(rx, oy, ox, ry, 0, ry);
            ctx.bezierCurveTo(-ox, ry, -rx, oy, -rx, 0);

            // ctx.beginPath();
            // ctx.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI);    chrome only
            ctx.restore();
        }

        copy(base ? : EllipseShape): EllipseShape {
            if (!base)
                base = new EllipseShape(this.rx, this.ry);
            super.copy(base);
            extend(base, this);
            return base;
        }

        fromRect(x: number, y: number, w: number, h: number) {
            this.transform.translate.x = x + w * 0.5;
            this.transform.translate.y = y + h * 0.5;
            this.rx = w * 0.5;
            this.ry = h * 0.5;
            this.calculateBounds();
        }

        calculateBounds() {
            var transform = this.transform;

            var hw = this.rx * transform.scale.x;
            var hh = this.ry * transform.scale.y;

            this.oabb.rotate = transform.rotate;
            this.oabb.hw = hw;
            this.oabb.hh = hh;
            this.oabb.cx = transform.translate.x;
            this.oabb.cy = transform.translate.y;

            this.aabb.rotate = 0;

            var rot = this.transform.rotate
            var ux = hw * Math.cos(rot);
            var uy = hw * Math.sin(rot);
            var vx = hh * Math.cos(rot + Math.PI * 0.5);
            var vy = hh * Math.sin(rot + Math.PI * 0.5);

            var rotatedHW = Math.sqrt(ux * ux + vx * vx);
            var rotatedHH = Math.sqrt(uy * uy + vy * vy);

            this.aabb.cx = this.oabb.cx;
            this.aabb.cy = this.oabb.cy;
            this.aabb.hw = rotatedHW;
            this.aabb.hh = rotatedHH;
        }
    }

    // cannot transform!!!
    class AABBShape extends Shape {
        public x1: number;
        public y1: number;
        public x2: number;
        public y2: number;

        constructor() {
            super();
        }

        copy(base ? : AABBShape): AABBShape {
            if (!base)
                base = new AABBShape();
            super.copy(base);
            extend(base, this);
            return base;
        }

        buildPath(ctx) {
            // don't apply transform!
            ctx.beginPath();
            var x1 = this.oabb.cx - this.oabb.hw;
            var y1 = this.oabb.cy - this.oabb.hh;
            ctx.rect(x1, y1, this.oabb.hw * 2, this.oabb.hh * 2);
        }

        calculateBounds() {
            var hw = (this.x2 - this.x1) * 0.5;
            var hh = (this.y2 - this.y1) * 0.5;

            this.oabb.rotate = 0;
            this.oabb.cx = this.x1 + hw;
            this.oabb.cy = this.y1 + hh;
            this.oabb.hw = Math.abs(hw);
            this.oabb.hh = Math.abs(hh);

            this.aabb = this.oabb;
        }
    }

    //------------------------------
    class ShapeList {
        shapes: Shape[] = [];
        selectedShapes: Shape[] = [];
        selectedStyle: Style = new Style();

        constructor() {
            this.selectedStyle.strokeStyle = "blue";
            this.selectedStyle.fillStyle = "none";
            this.selectedStyle.lineWidth = 2;
            this.selectedStyle.lineDash = [5, 5];
        }

        addShape(shape: Shape) {
            shape.isDeleted = false;
            this.shapes.push(shape);
        }

        removeShape(shape: Shape) {
            shape.isDeleted = true;
        }

        toggleSelected(shapes: Shape[]) {
            for (var i: number = 0; i < shapes.length; ++i) {
                var shape: Shape = shapes[i];
                var index: number = this.selectedShapes.indexOf(shape);
                if (index === -1)
                    this.selectedShapes.push(shape);
                else
                    this.selectedShapes.splice(index, 1);
            }
        }

        setSelectedShapes(shapes: Shape[]) {
            this.selectedShapes = shapes.slice(); // copy
        }

        getSelectedShapes(): Shape[] {
            return this.selectedShapes;
        }

        clearSelectedShapes() {
            this.selectedShapes.length = 0;
        }

        requestDraw() {
            var self = this;
            requestAnimationFrame(function() {
                self.draw(g_ctx);
                self.drawSelect(g_toolCtx);
            });
        }

        draw(ctx) {
            this.clear(ctx);
            // normal shapes
            var numShapes: number = this.shapes.length;
            for (var i: number = 0; i < numShapes; ++i) {
                var shape: Shape = this.shapes[i];
                if (!shape.isDeleted)
                    shape.draw(ctx);
            }
        }

        drawSelect(ctx) {
            this.selectedStyle.draw(ctx);
            this.clear(ctx);
            // selected shapes
            var numSelectedShapes: number = this.selectedShapes.length;
            for (var i: number = 0; i < numSelectedShapes; ++i) {
                var shape: Shape = this.selectedShapes[i];
                assert(!shape.isDeleted);
                shape.drawSelect(ctx);
            }
        }

        clear(ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }

        getShapeInXY(x: number, y: number): Shape {
            // in reverse as the last shapes are drawn on top
            for (var i: number = this.shapes.length - 1; i >= 0; --i) {
                var shape: Shape = this.shapes[i];
                if (!shape.isDeleted && shape.isInsideXY(x, y))
                    return shape;
            }

            return null;
        }

        getShapesInBounds(bounds: Bounds): Shape[] {
            var shapes: Shape[] = [];

            for (var i: number = this.shapes.length - 1; i >= 0; --i) {
                var shape: Shape = this.shapes[i];
                if (!shape.isDeleted && shape.isOverlapBounds(bounds)) {
                    shape.isOverlapBounds(bounds);
                    shapes.push(shape);
                }
            }

            return shapes;
        }
    }
    var g_shapeList: ShapeList = new ShapeList();

    //------------------------------
    class Grid {
        snapToGrid: boolean = false;
        gridSize: number = 10;
        snapToShape: boolean = true;
        xTabs: number[] = [];
        yTabs: number[] = [];
        shapeGravity: number = 10;
        snapToX: number = -1;
        snapToY: number = -1;

        constructor() {

        }

        private getClosestIndex(list: number[], value: number, index: number): number {
            var bestDist: number = Math.abs(value - list[index]);
            var bestIndex: number = index;
            var leftIndex: number = index - 1;
            var rightIndex: number = index + 1;

            if (rightIndex < list.length) {
                var dist = Math.abs(value - list[rightIndex]);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIndex = rightIndex;
                }
            }

            if (leftIndex >= 0) {
                var dist = Math.abs(value - list[leftIndex]);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIndex = leftIndex;
                }
            }

            return bestIndex;
        }

        snapXY(x: number, y: number): XY {
            var pos: XY = {
                x: x,
                y: y
            };

            if (this.snapToGrid) {
                pos.x = pos.x % this.gridSize;
                pos.y = pos.y % this.gridSize;
            } else if (this.snapToShape) {
                var i = getIndexOfSorted(this.xTabs, pos.x);
                i = this.getClosestIndex(this.xTabs, pos.x, i);
                if (Math.abs(this.xTabs[i] - pos.x) < this.shapeGravity) {
                    pos.x = this.xTabs[i];
                    this.snapToX = pos.x;
                } else {
                    this.snapToX = -1;
                }

                var j = getIndexOfSorted(this.yTabs, pos.y);
                j = this.getClosestIndex(this.yTabs, pos.y, j);
                if (Math.abs(this.yTabs[j] - pos.y) < this.shapeGravity) {
                    pos.y = this.yTabs[j];
                    this.snapToY = pos.y;
                } else {
                    this.snapToY = -1;
                }
            }

            return pos;
        }

        rebuildTabs(excludeShapes: Shape[] = []) {
            if (!this.snapToShape)
                return;

            this.xTabs.length = 0;
            this.yTabs.length = 0;

            for (var i: number = 0; i < g_shapeList.shapes.length; ++i) {
                var shape: Shape = g_shapeList.shapes[i];
                if (shape.isDeleted || excludeShapes.indexOf(shape) !== -1)
                    continue;

                var polygon: number[] = shape.aabb.toPolygon();
                var x1: number = arrayMin(polygon, 0, 2);
                var x2: number = arrayMax(polygon, 0, 2);
                var y1: number = arrayMin(polygon, 1, 2);
                var y2: number = arrayMax(polygon, 1, 2);
                var cx: number = (x1 + x2) * 0.5;
                var cy: number = (y1 + y2) * 0.5;

                insertSortedUnique(this.xTabs, x1);
                insertSortedUnique(this.xTabs, x2);
                insertSortedUnique(this.xTabs, cx);
                insertSortedUnique(this.yTabs, y1);
                insertSortedUnique(this.yTabs, y2);
                insertSortedUnique(this.yTabs, cy);
            }

            // g_toolCtx.beginPath();
            // for (var i = 0; i < this.xTabs.length; ++i) {
            //     g_toolCtx.moveTo(this.xTabs[i], 0);
            //     g_toolCtx.lineTo(this.xTabs[i], 1000);
            // }
            // for (var i = 0; i < this.yTabs.length; ++i) {
            //     g_toolCtx.moveTo(0, this.yTabs[i]);
            //     g_toolCtx.lineTo(1000, this.yTabs[i]);
            // }
            // g_toolCtx.stroke();
        }

    }
    var g_grid: Grid = new Grid();

    //------------------------------
    interface Command {
        redo();
        undo();
    }

    class CommandList {
        commands: Command[] = [];
        currentIndex: number = 0;

        constructor() {}

        addCommand(command: Command) {
            this.commands.length = this.currentIndex; // clip to the current undo level
            this.commands.push(command);
            this.currentIndex = this.commands.length; // past the end of the list
            command.redo();
        }

        clear() {
            this.commands.length = 0;
        }

        undo() {
            if (this.currentIndex <= 0)
                return; // nothing left to undo

            this.currentIndex--;
            this.commands[this.currentIndex].undo();
        }

        redo() {
            if (this.currentIndex >= this.commands.length)
                return; // nothing undone

            this.commands[this.currentIndex].redo();
            this.currentIndex++;
        }
    }
    var g_commandList: CommandList = new CommandList();

    class ShapeCommand implements Command {
        public shape: Shape = null;

        redo() {
            g_shapeList.addShape(this.shape);
            g_shapeList.requestDraw();
        }

        undo() {
            g_shapeList.removeShape(this.shape);
            g_shapeList.requestDraw();
        }
    }

    class RectCommand extends ShapeCommand {

        constructor(public x: number, public y: number, public w: number, public h: number) {
            super();

            this.shape = new RectShape(this.w, this.h);
            this.shape.transform.translate.x = this.x;
            this.shape.transform.translate.y = this.y;
            this.shape.setStyle(g_style);
        }
    }

    class EllipseCommand extends ShapeCommand {

        constructor(public x: number, public y: number, public rx: number, public ry: number) {
            super();

            this.shape = new EllipseShape(this.rx, this.ry);
            this.shape.transform.translate.x = this.x;
            this.shape.transform.translate.y = this.y;
            this.shape.setStyle(g_style);
        }
    }

    class TransformCommand implements Command {
        originalTransform: Transform = new Transform();

        constructor(public shape: Shape, public transform: Transform) {
            extend(this.originalTransform, shape.transform);
        }

        redo() {
            extend(this.shape.transform, this.transform);
            this.shape.calculateBounds();
            g_shapeList.requestDraw();
        }

        undo() {
            extend(this.shape.transform, this.originalTransform);
            this.shape.calculateBounds();
            g_shapeList.requestDraw();
        }
    }

    class SelectCommand implements Command {
        selectedShapes: Shape[] = [];

        constructor(public shapes: Shape[]) {
            this.selectedShapes = g_shapeList.getSelectedShapes().slice();
        }

        redo() {
            g_shapeList.setSelectedShapes(this.selectedShapes);
            g_shapeList.toggleSelected(this.shapes);
            g_shapeList.requestDraw();
        }

        undo() {
            g_shapeList.setSelectedShapes(this.selectedShapes);
            g_shapeList.requestDraw();
        }
    }

    //------------------------------
    interface Tool {
        onPointer(e: InteractionHelper.Event);
    }
    var g_tool: Tool = null;

    function setTool(toolName: string) {
        var oldTool = g_tool;
        switch (toolName) {
            case "selectTool":
                g_tool = new SelectTool();
                break;

            case "resizeTool":
                g_tool = new ResizeTool();
                break;

            case "moveTool":
                g_tool = new MoveTool();
                break;

            case "rectTool":
                g_tool = new RectTool();
                break;

            case "ellipseTool":
                g_tool = new EllipseTool();
                break;

            case "rotateTool":
                g_tool = new RotateTool();
                break;
        }

        if (g_tool !== oldTool) {
            console.log("Changed tool to: " + toolName);
        }
    }

    class TemplateTool implements Tool {
        constructor() {

        }

        onPointer(e: InteractionHelper.Event) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    break;
                case InteractionHelper.State.Move:
                    break;
                case InteractionHelper.State.End:
                    break;
            }
        }
    }

    class DrawTool implements Tool {
        public shape: Shape = null;
        public canUse: boolean = false;

        constructor() {}

        public clear() {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        }

        public draw() {
            this.clear();
            this.shape.calculateBounds();
            this.shape.draw(g_toolCtx);
        }

        onPointer(e: InteractionHelper.Event) {}
    }

    class RectTool extends DrawTool {
        private rectShape: RectShape = new RectShape(0, 0);
        private x1: number = -1;
        private y1: number = -1;
        private x2: number = -1;
        private y2: number = -1;

        constructor() {
            super();
            this.shape = this.rectShape;
            this.rectShape.style = g_drawStyle;
        }

        onPointer(e: InteractionHelper.Event) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    g_grid.rebuildTabs();
                    var pos: XY = g_grid.snapXY(e.x, e.y);
                    this.x1 = pos.x;
                    this.y1 = pos.y;
                    break;

                case InteractionHelper.State.Move:
                    var pos: XY = g_grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
                    this.canUse = true;
                    this.drawShape();
                    break;

                case InteractionHelper.State.End:
                    this.clear();
                    if (this.canUse) {
                        var newCommand = new RectCommand(
                            this.rectShape.transform.translate.x,
                            this.rectShape.transform.translate.y,
                            this.rectShape.w,
                            this.rectShape.h);
                        g_commandList.addCommand(newCommand);
                        this.canUse = false;
                    }
                    break;
            }
        }

        private drawShape() {
            this.rectShape.fromRect(
                Math.min(this.x1, this.x2),
                Math.min(this.y1, this.y2),
                Math.abs(this.x2 - this.x1),
                Math.abs(this.y2 - this.y1));

            this.draw();
        }
    }

    class EllipseTool extends DrawTool {
        private ellipseShape: EllipseShape = new EllipseShape(0, 0);
        private x1: number;
        private x2: number;
        private y1: number;
        private y2: number;

        constructor() {
            super();
            this.shape = this.ellipseShape;
            this.ellipseShape.style = g_drawStyle;
        }

        onPointer(e: InteractionHelper.Event) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    g_grid.rebuildTabs();
                    var pos: XY = g_grid.snapXY(e.x, e.y);
                    this.x1 = pos.x;
                    this.y1 = pos.y;
                    break;
                case InteractionHelper.State.Move:
                    var pos: XY = g_grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
                    this.canUse = true;
                    this.drawShape();
                    break;
                case InteractionHelper.State.End:
                    this.clear();
                    if (this.canUse) {
                        var newCommand = new EllipseCommand(
                            this.ellipseShape.transform.translate.x,
                            this.ellipseShape.transform.translate.y,
                            this.ellipseShape.rx,
                            this.ellipseShape.ry);
                        g_commandList.addCommand(newCommand);
                        this.canUse = false;
                    }
                    break;
            }
        }

        private drawShape() {
            this.ellipseShape.fromRect(
                Math.min(this.x1, this.x2),
                Math.min(this.y1, this.y2),
                Math.abs(this.x2 - this.x1),
                Math.abs(this.y2 - this.y1));
            this.draw();
        }
    }

    class SelectTool implements Tool {
        private aabbShape: AABBShape = new AABBShape();
        private y1: number;
        private x2: number;
        private y2: number;

        constructor() {
            this.aabbShape.style = g_selectStyle;
        }

        onPointer(e: InteractionHelper.Event) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.aabbShape.x1 = e.x;
                    this.aabbShape.y1 = e.y;
                    this.aabbShape.x2 = e.x;
                    this.aabbShape.y2 = e.y;
                    this.aabbShape.calculateBounds();
                    break;
                case InteractionHelper.State.Move:
                    this.aabbShape.x2 = e.x;
                    this.aabbShape.y2 = e.y;
                    this.aabbShape.calculateBounds();
                    this.drawSelect();
                    break;
                case InteractionHelper.State.End:
                    this.clear();
                    var shapes: Shape[] = g_shapeList.getShapesInBounds(this.aabbShape.aabb);
                    if (shapes.length > 0)
                        g_commandList.addCommand(new SelectCommand(shapes));
                    break;
            }
        }

        private clear() {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        }

        private drawSelect() {
            this.clear();

            this.aabbShape.draw(g_toolCtx);

            g_shapeList.selectedStyle.draw(g_toolCtx);
            var shapes: Shape[] = g_shapeList.getShapesInBounds(this.aabbShape.aabb);
            for (var i = 0; i < shapes.length; ++i) {
                shapes[i].drawSelect(g_toolCtx);
            }
        }
    }

    class ResizeTool implements Tool {
        resizeShape: Shape = null;
        shape: Shape = null;
        handle: ResizeTool.HandleFlag = ResizeTool.HandleFlag.None;
        handleSize: number = 20;
        canUse: boolean = false;
        startLocalPos: XY = null;

        constructor() {}

        onPointer(e: InteractionHelper.Event) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.shape = g_shapeList.getShapeInXY(e.x, e.y);
                    this.handle = ResizeTool.HandleFlag.None;

                    if (this.shape) {
                        this.resizeShape = this.shape.copy();
                        this.resizeShape.style = g_selectStyle;

                        var transform = this.shape.transform;
                        var localPos: XY = transform.inv(e.x, e.y);
                        var oabb: Bounds = this.shape.oabb;
                        var handleX = this.handleSize / transform.scale.x;
                        var handleY = this.handleSize / transform.scale.y;

                        if (localPos.x + oabb.hw < handleX)
                            this.handle = (this.handle | ResizeTool.HandleFlag.Left);
                        else if (oabb.hw - localPos.x < handleX)
                            this.handle = (this.handle | ResizeTool.HandleFlag.Right);

                        if (localPos.y + oabb.hh < handleY)
                            this.handle = (this.handle | ResizeTool.HandleFlag.Top);
                        else if (oabb.hh - localPos.y < handleY)
                            this.handle = (this.handle | ResizeTool.HandleFlag.Bottom);

                        if (this.handle === ResizeTool.HandleFlag.None)
                            this.handle = ResizeTool.HandleFlag.Middle;

                        this.startLocalPos = localPos;
                    }
                    break;

                case InteractionHelper.State.Move:
                    if (this.shape) {
                        var transform = this.resizeShape.transform;
                        var oldTransform = this.shape.transform;
                        var localPos: XY = oldTransform.inv(e.x, e.y);
                        var dx = (localPos.x - this.startLocalPos.x) * oldTransform.scale.x;
                        var dy = (localPos.y - this.startLocalPos.y) * oldTransform.scale.y;
                        var sx = dx / (this.resizeShape.oabb.hw * 2);
                        var sy = dy / (this.resizeShape.oabb.hh * 2);
                        var cr = Math.cos(oldTransform.rotate);
                        var sr = Math.sin(oldTransform.rotate);

                        if (this.handle & ResizeTool.HandleFlag.Left) {
                            transform.translate.x = oldTransform.translate.x + dx * cr * 0.5;
                            transform.translate.y = oldTransform.translate.y + dx * sr * 0.5;
                            transform.scale.x = oldTransform.scale.x - sx;
                        }
                        if (this.handle & ResizeTool.HandleFlag.Right) {
                            transform.translate.x = oldTransform.translate.x + dx * cr * 0.5;
                            transform.translate.y = oldTransform.translate.y + dx * sr * 0.5;
                            transform.scale.x = oldTransform.scale.x + sx;
                        }
                        if (this.handle & ResizeTool.HandleFlag.Top) {
                            transform.translate.x = oldTransform.translate.x - dy * sr * 0.5;
                            transform.translate.y = oldTransform.translate.y + dy * cr * 0.5;
                            transform.scale.y = oldTransform.scale.y - sy;
                        }
                        if (this.handle & ResizeTool.HandleFlag.Bottom) {
                            transform.translate.x = oldTransform.translate.x - dy * sr * 0.5;
                            transform.translate.y = oldTransform.translate.y + dy * cr * 0.5;
                            transform.scale.y = oldTransform.scale.y + sy;
                        }
                        if (this.handle === ResizeTool.HandleFlag.Middle) {
                            transform.translate.x += e.deltaX;
                            transform.translate.y += e.deltaY;
                        }
                        this.canUse = this.handle !== ResizeTool.HandleFlag.None;
                        this.drawResize();
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.shape && this.canUse) {
                        var newCommand = new TransformCommand(this.shape, this.resizeShape.transform);
                        g_commandList.addCommand(newCommand);
                    }
                    this.clear();
                    this.canUse = false;
                    this.shape = null;
                    break;
            }
        }

        private clear() {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        }

        private drawResize() {
            this.clear();

            this.resizeShape.draw(g_toolCtx);
        }
    }

    module ResizeTool {
        export enum HandleFlag {
            None = 0, Left = 1, Right = 2, Top = 4, Bottom = 8, Middle = 16
        };
    }

    class RotateTool implements Tool {
        shape: Shape = null;
        lastAngle: number = 0;
        rotateShape: Shape = null;
        pivot: XY = {
            x: 0,
            y: 0
        };

        constructor() {

        }

        onPointer(e: InteractionHelper.Event) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.shape = g_shapeList.getShapeInXY(e.x, e.y);
                    if (this.shape) {
                        this.rotateShape = this.shape.copy();
                        this.rotateShape.style = g_selectStyle;
                        this.pivot = this.rotateShape.transform.translate;
                        this.lastAngle = this.getAngle(e.x, e.y, this.pivot);
                    }
                    break;

                case InteractionHelper.State.Move:
                    if (this.rotateShape) {
                        var newAngle = this.getAngle(e.x, e.y, this.pivot);
                        this.rotateShape.transform.rotate += newAngle - this.lastAngle;
                        this.lastAngle = newAngle;
                        this.drawRotate();
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.rotateShape) {
                        var newCommand = new TransformCommand(this.shape, this.rotateShape.transform);
                        g_commandList.addCommand(newCommand);
                    }

                    this.clear();
                    this.rotateShape = null;
                    this.shape = null;
                    break;
            }
        }

        private clear() {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        }

        private drawRotate() {
            this.clear();

            this.rotateShape.calculateBounds();
            this.rotateShape.draw(g_toolCtx);
        }

        private getAngle(x: number, y: number, pivot: XY): number {
            var dy = y - pivot.y;
            var dx = x - pivot.x;
            if (Math.abs(dy) < EPSILON && Math.abs(dx) < EPSILON)
                return 0;

            return Math.atan2(dy, dx);
        }
    }

    class MoveTool implements Tool {
        moveShape: Shape = null;
        shape: Shape = null;
        canUse: boolean = false;

        constructor() {}

        onPointer(e: InteractionHelper.Event) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.shape = g_shapeList.getShapeInXY(e.x, e.y);

                    if (this.shape) {
                        this.moveShape = this.shape.copy();
                        this.moveShape.style = g_selectStyle;
                    }
                    break;

                case InteractionHelper.State.Move:
                    if (this.shape) {
                        var transform = this.moveShape.transform;
                        transform.translate.x += e.deltaX;
                        transform.translate.y += e.deltaY;
                        this.moveShape.calculateBounds();
                        this.canUse = true;
                        this.drawMove();
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.shape && this.canUse) {
                        var newCommand = new TransformCommand(this.shape, this.moveShape.transform);
                        g_commandList.addCommand(newCommand);
                    }
                    this.canUse = false;
                    this.shape = null;
                    break;
            }
        }

        private clear() {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        }

        private drawMove() {
            this.clear();

            this.moveShape.draw(g_toolCtx);
            g_toolCtx.strokeStyle = "orange";
            this.moveShape.drawSelect(g_toolCtx);
            g_toolCtx.strokeStyle = "violet";
            this.moveShape.drawAABB(g_toolCtx);
        }
    }

    //------------------------------
    function toolButtonClick(e) {
        setTool(e.target.id);
    }

    window.addEventListener("load", function() {
        g_canvas = document.getElementById("layoutbase");
        g_toolCanvas = document.getElementById("layouttool");

        g_ctx = g_canvas.getContext("2d");
        g_toolCtx = g_toolCanvas.getContext("2d");

        var toolElems = document.querySelectorAll(".tool");
        for (var i: number = 0; i < toolElems.length; ++i) {
            toolElems[i].addEventListener("click", toolButtonClick);
        }

        document.getElementById("undo").addEventListener("click", function() {
            g_commandList.undo();
        });
        document.getElementById("redo").addEventListener("click", function() {
            g_commandList.redo();
        });

        setTool("rectTool");

        var watchCanvas = new InteractionHelper.Watch(g_toolCanvas, function(e) {
            g_tool.onPointer(e);
        });
    });
}
