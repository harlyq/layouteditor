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

    function arrayMin(list: number[]): number {
        if (list.length === 0)
            return 0;

        var min = list[0];
        for (var i: number = list.length - 1; i > 0; --i) {
            var val = list[i];
            if (val < min)
                min = val;
        }
        return min;
    }

    function arrayMax(list: number[]): number {
        if (list.length === 0)
            return 0;

        var max = list[0];
        for (var i: number = list.length - 1; i > 0; --i) {
            var val = list[i];
            if (val > max)
                max = val;
        }
        return max;
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
        x1: number;
        y1: number;
        x2: number; // x2 > x1
        y2: number; // y2 > y1

        constructor() {}
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
        pivot: XY = {
            x: 0,
            y: 0
        }

        calc(x: number, y: number): XY {
            var newPos: XY = {
                x: 0,
                y: 0
            };
            var sr: number = Math.sin(this.rotate);
            var cr: number = Math.cos(this.rotate);

            var lx: number = (x - this.pivot.x) * this.scale.x;
            var ly: number = (y - this.pivot.y) * this.scale.y;
            newPos.x = (lx * cr + ly * sr) + this.translate.x;
            newPos.y = (-lx * sr + ly * cr) + this.translate.y;

            newPos.x += this.pivot.x;
            newPos.y += this.pivot.y;

            return newPos;
        }

        inv(x: number, y: number): XY {
            var newPos: XY = {
                x: 0,
                y: 0
            };

            var sr: number = Math.sin(this.rotate);
            var cr: number = Math.cos(this.rotate);

            newPos.x = x - this.pivot.x - this.translate.x;
            newPos.y = y - this.pivot.y - this.translate.y;

            var lx: number = 0;
            var ly: number = 0;

            if (Math.abs(cr) < EPSILON) {
                lx = -newPos.y / sr;
                ly = newPos.x / sr;
            } else if (Math.abs(sr) < EPSILON) {
                lx = newPos.x / cr;
                ly = newPos.y / cr;
            } else {
                lx = (newPos.x * cr - newPos.y) / (cr * cr + sr);
                ly = (newPos.y + lx * sr) / cr;
            }

            return newPos;
        }
    }

    //------------------------------
    class Shape {
        style: Style = g_defaultStyle;
        isDeleted: boolean = false;
        bounds: Bounds = new Bounds();
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
            ctx.strokeRect(
                this.bounds.x1,
                this.bounds.y1,
                this.bounds.x2 - this.bounds.x1,
                this.bounds.y2 - this.bounds.y1);
        }

        // performed by the derived class
        calculateBounds() {}

        isInsideXY(x: number, y: number): boolean {
            this.buildPath(g_toolCtx);
            return g_toolCtx.isPointInPath(x, y);
        }

        isOverlap(bounds: Bounds): boolean {
            // overlap with bounds
            return bounds.x1 < this.bounds.x2 && bounds.y1 < this.bounds.y2 &&
                bounds.x2 > this.bounds.x1 && bounds.y2 > this.bounds.y1;
        }

        copy(base ? : Shape): Shape {
            if (!base)
                base = new Shape();
            extend(base, this);
            return base;
        }
    }

    class RectShape extends Shape {
        constructor(public x: number, public y: number, public w: number, public h: number) {
            super();
            this.calculateBounds();
        }

        buildPath(ctx) {
            var transform = this.transform;

            ctx.save();
            ctx.scale(transform.scale.x, transform.scale.y);
            ctx.translate(transform.pivot.x, transform.pivot.y);
            ctx.rotate(transform.rotate);
            ctx.translate(transform.translate.x + this.x, transform.translate.y + this.y);

            ctx.beginPath();
            ctx.rect(-transform.pivot.x, -transform.pivot.y, this.w, this.h);
            ctx.restore();
        }

        copy(base ? : RectShape): RectShape {
            if (!base)
                base = new RectShape(this.x, this.y, this.w, this.h);
            super.copy(base);
            extend(base, this);
            return base;
        }

        calculateBounds() {
            this.transform.pivot.x = this.x + this.w * 0.5;
            this.transform.pivot.y = this.y + this.h * 0.5;

            var topLeft: XY = this.transform.calc(this.x, this.y);
            var topRight: XY = this.transform.calc(this.x + this.w, this.y);
            var bottomLeft: XY = this.transform.calc(this.x, this.y + this.h);
            var bottomRight: XY = this.transform.calc(this.x + this.w, this.y + this.h);

            this.bounds.x1 = arrayMin([topLeft.x, topRight.x, bottomLeft.x, bottomRight.x]);
            this.bounds.y1 = arrayMin([topLeft.y, topRight.y, bottomLeft.y, bottomRight.y]);
            this.bounds.x2 = arrayMax([topLeft.x, topRight.x, bottomLeft.x, bottomRight.x]);
            this.bounds.y2 = arrayMax([topLeft.y, topRight.y, bottomLeft.y, bottomRight.y]);
        }
    }

    class EllipseShape extends Shape {
        constructor(public x: number, public y: number, public rx: number, public ry: number) {
            super();
            this.calculateBounds();
        }

        buildPath(ctx) {
            var transform = this.transform;
            var x = this.x;
            var y = this.y;
            var rx = this.rx;
            var ry = this.ry;
            if (rx < 0) {
                x += 2 * rx;
                rx = -rx;
            }
            if (ry < 0) {
                y += 2 * ry;
                ry = -ry;
            }

            ctx.save();
            ctx.scale(transform.scale.x, transform.scale.y);
            ctx.translate(transform.pivot.x, transform.pivot.y);
            ctx.rotate(transform.rotate);
            ctx.translate(transform.translate.x + x + rx, transform.translate.y + y + ry);

            ctx.beginPath();
            ctx.ellipse(-transform.pivot.x, -transform.pivot.y, rx, ry, 0, 0, 2 * Math.PI);
            ctx.restore(); // restore before stroke so lines is not stretched
        }

        copy(base ? : EllipseShape): EllipseShape {
            if (!base)
                base = new EllipseShape(this.x, this.y, this.rx, this.ry);
            super.copy(base);
            extend(base, this);
            return base;
        }

        calculateBounds() {
            var transform = this.transform;
            transform.pivot.x = this.x + this.rx;
            transform.pivot.y = this.y + this.ry;

            // TODO handle the case where the pivot is not the center
            var ux: number = this.rx * Math.cos(transform.rotate);
            var uy: number = this.rx * Math.sin(transform.rotate);
            var vx: number = this.ry * Math.cos(transform.rotate + Math.PI * 0.5);
            var vy: number = this.ry * Math.sin(transform.rotate + Math.PI * 0.5);

            var rrx = Math.sqrt(ux * ux + vx * vx);
            var rry = Math.sqrt(uy * uy + vy * vy);
            var cx = this.x + this.rx;
            var cy = this.y + this.ry;

            var topLeft: XY = transform.calc(cx - rrx, cy - rry);
            var bottomRight: XY = transform.calc(this.x + 2 * this.rx, this.y + 2 * this.ry);

            this.bounds.x1 = arrayMin([cx - rrx, cx + rrx]);
            this.bounds.y1 = arrayMin([cy - rry, cy + rry]);
            this.bounds.x2 = arrayMax([cx - rrx, cx + rrx]);
            this.bounds.y2 = arrayMax([cy - rry, cy + rry]);
        }
    }

    // cannot transform!!!
    class BoundsShape extends Shape {
        public x1: number;
        public y1: number;
        public x2: number;
        public y2: number;

        constructor() {
            super();
        }

        copy(base ? : BoundsShape): BoundsShape {
            if (!base)
                base = new BoundsShape();
            super.copy(base);
            extend(base, this);
            return base;
        }

        buildPath(ctx) {
            // don't apply transform!
            ctx.beginPath();
            var x1 = this.bounds.x1;
            var x2 = this.bounds.x2;
            var y1 = this.bounds.y1;
            var y2 = this.bounds.y2;
            ctx.rect(x1, y1, x2 - x1, y2 - y1);
        }

        calculateBounds() {
            this.transform.pivot.x = (this.x1 + this.x2) * 0.5;
            this.transform.pivot.y = (this.y1 + this.y2) * 0.5;
            if (this.x1 < this.x2) {
                this.bounds.x1 = this.x1;
                this.bounds.x2 = this.x2;
            } else {
                this.bounds.x1 = this.x2;
                this.bounds.x2 = this.x1;
            }
            if (this.y1 < this.y2) {
                this.bounds.y1 = this.y1;
                this.bounds.y2 = this.y2;
            } else {
                this.bounds.y1 = this.y2;
                this.bounds.y2 = this.y1;
            }
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
                if (shape.isInsideXY(x, y))
                    return shape;
            }

            return null;
        }

        getShapesInBounds(bounds: Bounds): Shape[] {
            var shapes: Shape[] = [];

            for (var i: number = this.shapes.length - 1; i >= 0; --i) {
                var shape: Shape = this.shapes[i];
                if (shape.isOverlap(bounds))
                    shapes.push(shape);
            }

            return shapes;
        }
    }
    var g_shapeList: ShapeList = new ShapeList();

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

            this.shape = new RectShape(this.x, this.y, this.w, this.h);
            this.shape.setStyle(g_style);
        }
    }

    class EllipseCommand extends ShapeCommand {

        constructor(public x: number, public y: number, public rx: number, public ry: number) {
            super();

            this.shape = new EllipseShape(this.x, this.y, this.rx, this.ry);
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
            this.shape.draw(g_toolCtx);
        }

        onPointer(e: InteractionHelper.Event) {}
    }

    class RectTool extends DrawTool {
        private rectShape: RectShape = new RectShape(0, 0, 0, 0);
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
                    this.x1 = e.x;
                    this.y1 = e.y;
                    break;
                case InteractionHelper.State.Move:
                    this.x2 = e.x;
                    this.y2 = e.y;
                    this.canUse = true;
                    this.drawShape();
                    break;
                case InteractionHelper.State.End:
                    this.clear();
                    if (this.canUse) {
                        var newCommand = new RectCommand(
                            this.rectShape.x,
                            this.rectShape.y,
                            this.rectShape.w,
                            this.rectShape.h);
                        g_commandList.addCommand(newCommand);
                        this.canUse = false;
                    }
                    break;
            }
        }

        private drawShape() {
            this.rectShape.x = Math.min(this.x1, this.x2);
            this.rectShape.y = Math.min(this.y1, this.y2);
            this.rectShape.w = Math.abs(this.x2 - this.x1);
            this.rectShape.h = Math.abs(this.y2 - this.y1);

            this.draw();
        }
    }

    class EllipseTool extends DrawTool {
        private ellipseShape: EllipseShape = new EllipseShape(0, 0, 0, 0);
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
                    this.x1 = e.x;
                    this.y1 = e.y;
                    break;
                case InteractionHelper.State.Move:
                    this.x2 = e.x;
                    this.y2 = e.y;
                    this.canUse = true;
                    this.drawShape();
                    break;
                case InteractionHelper.State.End:
                    this.clear();
                    if (this.canUse) {
                        var newCommand = new EllipseCommand(
                            this.ellipseShape.x,
                            this.ellipseShape.y,
                            this.ellipseShape.rx,
                            this.ellipseShape.ry);
                        g_commandList.addCommand(newCommand);
                        this.canUse = false;
                    }
                    break;
            }
        }

        drawShape() {
            this.ellipseShape.x = this.x1;
            this.ellipseShape.y = this.y1;
            this.ellipseShape.rx = (this.x2 - this.x1) * 0.5;
            this.ellipseShape.ry = (this.y2 - this.y1) * 0.5;
            this.draw();
        }
    }

    class SelectTool implements Tool {
        private boundsShape: BoundsShape = new BoundsShape();
        private y1: number;
        private x2: number;
        private y2: number;

        constructor() {
            this.boundsShape.style = g_selectStyle;
        }

        onPointer(e: InteractionHelper.Event) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.boundsShape.x1 = e.x;
                    this.boundsShape.y1 = e.y;
                    this.boundsShape.x2 = e.x;
                    this.boundsShape.y2 = e.y;
                    this.boundsShape.calculateBounds();
                    break;
                case InteractionHelper.State.Move:
                    this.boundsShape.x2 = e.x;
                    this.boundsShape.y2 = e.y;
                    this.drawBounds();
                    break;
                case InteractionHelper.State.End:
                    this.clear();
                    var shapes: Shape[] = g_shapeList.getShapesInBounds(this.boundsShape.bounds);
                    if (shapes.length > 0)
                        g_commandList.addCommand(new SelectCommand(shapes));
                    break;
            }
        }

        private clear() {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        }

        private drawBounds() {
            this.clear();

            this.boundsShape.calculateBounds();
            this.boundsShape.draw(g_toolCtx);

            g_shapeList.selectedStyle.draw(g_toolCtx);
            var shapes: Shape[] = g_shapeList.getShapesInBounds(this.boundsShape.bounds);
            for (var i = 0; i < shapes.length; ++i) {
                shapes[i].drawSelect(g_toolCtx);
            }
        }
    }

    class ResizeTool implements Tool {
        boundsShape: BoundsShape = new BoundsShape();
        shape: Shape = null;
        handle: ResizeTool.HandleFlag = ResizeTool.HandleFlag.None;
        handleSize: number = 20;
        canUse: boolean = false;

        constructor() {
            this.boundsShape.style = g_selectStyle;
        }

        onPointer(e: InteractionHelper.Event) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.shape = g_shapeList.getShapeInXY(e.x, e.y);
                    this.handle = ResizeTool.HandleFlag.None;

                    if (this.shape) {
                        var x1 = this.shape.bounds.x1;
                        var y1 = this.shape.bounds.y1;
                        var x2 = this.shape.bounds.x2;
                        var y2 = this.shape.bounds.y2;

                        if (e.x - x1 < this.handleSize)
                            this.handle = (this.handle | ResizeTool.HandleFlag.Left);
                        else if (x2 - e.x < this.handleSize)
                            this.handle = (this.handle | ResizeTool.HandleFlag.Right);

                        if (e.y - y1 < this.handleSize)
                            this.handle = (this.handle | ResizeTool.HandleFlag.Top);
                        else if (y2 - e.y < this.handleSize)
                            this.handle = (this.handle | ResizeTool.HandleFlag.Bottom);

                        if (this.handle === ResizeTool.HandleFlag.None)
                            this.handle = ResizeTool.HandleFlag.Middle;

                        this.boundsShape.x1 = x1;
                        this.boundsShape.y1 = y1;
                        this.boundsShape.x2 = x2;
                        this.boundsShape.y2 = y2;
                    }
                    break;

                case InteractionHelper.State.Move:
                    if (this.handle & ResizeTool.HandleFlag.Left)
                        this.boundsShape.x1 += e.deltaX;
                    if (this.handle & ResizeTool.HandleFlag.Right)
                        this.boundsShape.x2 += e.deltaX;
                    if (this.handle & ResizeTool.HandleFlag.Top)
                        this.boundsShape.y1 += e.deltaY;
                    if (this.handle & ResizeTool.HandleFlag.Bottom)
                        this.boundsShape.y2 += e.deltaY;
                    if (this.handle === ResizeTool.HandleFlag.Middle) {
                        this.boundsShape.x1 += e.deltaX;
                        this.boundsShape.y1 += e.deltaY;
                        this.boundsShape.x2 += e.deltaX;
                        this.boundsShape.y2 += e.deltaY;
                    }
                    this.canUse = this.handle !== ResizeTool.HandleFlag.None;
                    this.drawBounds();
                    break;

                case InteractionHelper.State.End:
                    if (this.canUse) {
                        //var newCommand = new TransformCommand();
                        this.canUse = false;
                    }
                    this.shape = null;
                    break;
            }
        }

        private clear() {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        }

        private drawBounds() {
            this.clear();

            this.boundsShape.calculateBounds();
            this.boundsShape.draw(g_toolCtx);
        }
    }

    class RotateTool implements Tool {
        shape: Shape = null;
        lastAngle: number = 0;
        rotateShape: Shape = null;

        constructor() {

        }

        onPointer(e: InteractionHelper.Event) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.shape = g_shapeList.getShapeInXY(e.x, e.y);
                    if (this.shape) {
                        this.rotateShape = this.shape.copy();
                        this.rotateShape.style = g_selectStyle;
                        this.lastAngle = this.getAngle(e.x, e.y, this.rotateShape.transform.pivot);
                    }
                    break;

                case InteractionHelper.State.Move:
                    if (this.rotateShape) {
                        var newAngle = this.getAngle(e.x, e.y, this.rotateShape.transform.pivot);
                        this.rotateShape.transform.rotate += newAngle - this.lastAngle;
                        this.lastAngle = newAngle;
                        this.drawRotate();
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.rotateShape) {
                        var newCommand = new TransformCommand(this.shape, this.rotateShape.transform);
                        g_commandList.addCommand(newCommand);

                        this.clear();
                        this.rotateShape = null;
                        this.shape = null;
                    }
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

    module ResizeTool {
        export enum HandleFlag {
            None = 0, Left = 1, Right = 2, Top = 4, Bottom = 8, Middle = 16
        };
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
