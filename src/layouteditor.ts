// Copyright 2014 Reece Elliott

/// <reference path="interactionhelper.ts" />
module LayoutEditor {
    "use strict";

    var EPSILON = 0.01;
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
            if (props.hasOwnProperty(key))
                obj[key] = props[key];
        }
        return obj;
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
    g_drawStyle.strokeStyle = "red";
    g_drawStyle.lineDash = [2, 2];
    g_drawStyle.fillStyle = "none";

    var g_style: Style = g_defaultStyle;


    //------------------------------
    class Bounds {
        x1: number;
        y1: number;
        x2: number;
        y2: number;

        constructor() {}
    }

    //------------------------------
    class Shape {
        style: Style = g_defaultStyle;
        isDeleted: boolean = false;
        bounds: Bounds = new Bounds();

        constructor() {}

        setStyle(style: Style) {
            this.style = style;
        }

        draw(ctx) {
            this.style.draw(ctx);
        }

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
            return false;
        }

        clone(base ? : Shape): Shape {
            if (!base)
                base = new Shape();
            extend(base, this);
            return base;
        }
    }

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

        toggleSelected(shape: Shape) {
            var index: number = this.selectedShapes.indexOf(shape);
            if (index === -1)
                this.selectedShapes.push(shape);
            else
                this.selectedShapes.splice(index, 1);
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

        getShapeXY(x: number, y: number): Shape {
            // in reverse as the last shapes are drawn on top
            for (var i: number = this.shapes.length - 1; i >= 0; --i) {
                var shape: Shape = this.shapes[i];
                if (shape.isInsideXY(x, y))
                    return shape;
            }

            return null;
        }
    }
    var g_shapeList: ShapeList = new ShapeList();

    class RectShape extends Shape {
        constructor(public x: number, public y: number, public w: number, public h: number) {
            super();
            this.calculateBounds();
        }

        draw(ctx) {
            super.draw(ctx);

            if (this.style.fillStyle !== "none")
                ctx.fillRect(this.x, this.y, this.w, this.h);

            ctx.strokeRect(this.x, this.y, this.w, this.h);
        }

        isInsideXY(x: number, y: number): boolean {
            return x >= this.x && x < this.x + this.w && y >= this.y && y < this.y + this.h;
        }


        clone(base ? : RectShape): RectShape {
            if (!base)
                base = new RectShape(this.x, this.y, this.w, this.h);
            super.clone(base);
            extend(base, this);
            return base;
        }

        calculateBounds() {
            this.bounds.x1 = this.x;
            this.bounds.y1 = this.y;
            this.bounds.x2 = this.x + this.w;
            this.bounds.y2 = this.y + this.h;
        }
    }

    class EllipseShape extends Shape {
        constructor(public cx: number, public cy: number, public rx: number, public ry: number) {
            super();
            this.calculateBounds();
        }

        draw(ctx) {
            if (this.rx < EPSILON && this.ry < EPSILON)
                return; // too small to draw

            super.draw(ctx);

            // an ellipse is a scale circle
            var scaleX: number = 1;
            var scaleY: number = 1;
            var r: number = 0;
            if (this.rx > this.ry) {
                scaleY = this.ry / this.rx;
                r = this.rx;
            } else {
                scaleX = this.rx / this.ry;
                r = this.ry;
            }

            ctx.save();
            ctx.translate(this.cx, this.cy);
            ctx.scale(scaleX, scaleY);

            ctx.beginPath();
            ctx.arc(0, 0, r, 0, 2 * Math.PI);
            if (this.style.fillStyle !== "none")
                ctx.fill();
            ctx.stroke();

            ctx.restore(); // this can't be very performant
        }

        isInsideXY(x: number, y: number): boolean {
            var dx = (x - this.cx) / this.rx;
            var dy = (y - this.cy) / this.ry;
            return dx * dx + dy * dy < 1;
        }


        clone(base ? : EllipseShape): EllipseShape {
            if (!base)
                base = new EllipseShape(this.cx, this.cy, this.rx, this.ry);
            super.clone(base);
            extend(base, this);
            return base;
        }

        calculateBounds() {
            this.bounds.x1 = this.cx - this.rx;
            this.bounds.y1 = this.cy - this.ry;
            this.bounds.x2 = this.cx + this.rx;
            this.bounds.y2 = this.cy + this.ry;
        }
    }

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

        constructor(public cx: number, public cy: number, public rx: number, public ry: number) {
            super();

            this.shape = new EllipseShape(this.cx, this.cy, this.rx, this.ry);
            this.shape.setStyle(g_style);
        }
    }

    class AlterShapeCommand implements Command {
        originalShape: Shape = null;

        constructor(public shape: Shape, public newShape: Shape) {
            this.originalShape = shape.clone();
        }

        redo() {
            extend(this.shape, this.newShape);
            g_shapeList.requestDraw();
        }

        undo() {
            extend(this.shape, this.originalShape);
            g_shapeList.requestDraw();
        }
    }

    class SelectCommand implements Command {
        selectedShapes: Shape[] = [];

        constructor(public shape: Shape) {
            this.selectedShapes = g_shapeList.getSelectedShapes().slice();
        }

        redo() {
            g_shapeList.setSelectedShapes(this.selectedShapes);
            g_shapeList.toggleSelected(this.shape);
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
        switch (toolName) {
            case "rectTool":
                g_tool = new RectTool();
                break;

            case "selectTool":
                g_tool = new SelectTool();
                break;

            case "ellipseTool":
                g_tool = new EllipseTool();
                break;
        }
    }

    class DrawTool implements Tool {
        public shape: Shape = null;

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
                    this.drawShape();
                    break;
                case InteractionHelper.State.End:
                    this.clear();
                    var newCommand = new RectCommand(
                        this.rectShape.x,
                        this.rectShape.y,
                        this.rectShape.w,
                        this.rectShape.h);
                    g_commandList.addCommand(newCommand);
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
                    this.drawShape();
                    break;
                case InteractionHelper.State.End:
                    this.clear();
                    var newCommand = new EllipseCommand(
                        this.ellipseShape.cx,
                        this.ellipseShape.cy,
                        this.ellipseShape.rx,
                        this.ellipseShape.ry);
                    g_commandList.addCommand(newCommand);
                    break;
            }
        }

        drawShape() {
            this.ellipseShape.cx = (this.x1 + this.x2) * 0.5;
            this.ellipseShape.cy = (this.y1 + this.y2) * 0.5;
            this.ellipseShape.rx = (this.x2 - this.x1) * 0.5;
            this.ellipseShape.ry = (this.y2 - this.y1) * 0.5;
            this.draw();
        }
    }

    class SelectTool implements Tool {
        constructor() {}

        onPointer(e: InteractionHelper.Event) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    var shape: Shape = g_shapeList.getShapeXY(e.x, e.y);
                    if (shape)
                        g_commandList.addCommand(new SelectCommand(shape));
                    break;
            }
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

        setTool("rect");

        var watchCanvas = new InteractionHelper.Watch(g_toolCanvas, function(e) {
            g_tool.onPointer(e);
        });
    });
}
