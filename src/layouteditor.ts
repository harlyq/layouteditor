// Copyright 2014 Reece Elliott

/// <reference path="interactionhelper.ts" />
module LayoutEditor {
    "use strict";

    var g_canvas = null;
    var g_ctx = null;
    var g_div = null;
    var g_toolCanvas = null;
    var g_toolCtx = null;

    //------------------------------
    class Style {
        strokeStyle: string = "black";
        fillStyle: string = "white";
        lineWidth: string = "1";

        draw(ctx) {
            if (ctx.strokeStyle !== this.strokeStyle)
                ctx.strokeStyle = this.strokeStyle;
            if (ctx.fillStyle !== this.fillStyle)
                ctx.fillStyle = this.fillStyle;
            if (ctx.lineWidth !== this.lineWidth)
                ctx.lineWidth = this.lineWidth;
        }
    }
    var defaultStyle: Style = new Style();
    var g_style = defaultStyle;

    //------------------------------
    class Shape {
        style: Style = defaultStyle;

        constructor() {}

        setStyle(style: Style) {
            this.style = style;
        }

        draw(ctx) {
            this.style.draw(ctx);
        }
    }

    class ShapeList {
        shapes: Shape[] = [];

        constructor() {}

        addShape(shape: Shape) {
            this.shapes.push(shape);
        }

        removeShape(shape: Shape): boolean {
            var index: number = this.shapes.indexOf(shape);
            if (index !== -1)
                this.shapes.splice(index, 1);
            return index !== -1;
        }

        draw(ctx) {
            var numShapes: number = this.shapes.length;
            for (var i: number = 0; i < numShapes; ++i) {
                this.shapes[i].draw(ctx);
            }
        }

        clear(ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    }
    var g_shapeList: ShapeList = new ShapeList();

    class RectShape extends Shape {
        constructor(public x: number, public y: number, public w: number, public h: number) {
            super();
        }

        draw(ctx) {
            super.draw(ctx);

            ctx.strokeRect(this.x, this.y, this.w, this.h);
        }
    }

    //------------------------------
    interface Command {
        redo();
        undo();
    }

    class CommandList {
        commands: Command[] = [];

        constructor() {}

        addCommand(command: Command) {
            this.commands.push(command);
            command.redo();
        }

        removeCommand(command: Command): boolean {
            var index: number = this.commands.indexOf(command);
            if (index !== -1)
                this.commands.splice(index, 1);
            return index !== -1;
        }
    }
    var g_commandList: CommandList = new CommandList();

    class ShapeCommand implements Command {
        public shape: Shape = null;

        redo() {
            g_shapeList.addShape(this.shape);
            g_shapeList.clear(g_ctx);
            g_shapeList.draw(g_ctx);
        }

        undo() {
            g_shapeList.removeShape(this.shape);
            g_shapeList.clear(g_ctx);
            g_shapeList.draw(g_ctx);
        }
    }

    class RectCommand extends ShapeCommand {

        constructor(public x: number, public y: number, public w: number, public h: number) {
            super();

            this.shape = new RectShape(this.x, this.y, this.w, this.h);
            this.shape.setStyle(g_style);
        }
    }

    //------------------------------
    interface Tool {
        onPointer(e: InteractionHelper.Event);
    }
    var g_tool: Tool = null;

    function setTool(tool: Tool) {
        g_tool = tool;
    }

    class RectTool implements Tool {
        private x1: number = -1;
        private y1: number = -1;
        private x2: number = -1;
        private y2: number = -1;

        private getX(): number {
            return Math.min(this.x1, this.x2);
        }

        private getY(): number {
            return Math.min(this.y1, this.y2);
        }

        private getW(): number {
            return Math.abs(this.x1 - this.x2);
        }

        private getH(): number {
            return Math.abs(this.y1 - this.y2);
        }

        constructor() {}

        onPointer(e: InteractionHelper.Event) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.x1 = e.x;
                    this.y1 = e.y;
                    break;
                case InteractionHelper.State.Move:
                    this.x2 = e.x;
                    this.y2 = e.y;
                    this.draw();
                    break;
                case InteractionHelper.State.End:
                    this.clear();
                    g_commandList.addCommand(new RectCommand(this.getX(), this.getY(), this.getW(), this.getH()));
                    break;
            }
        }

        private clear() {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        }

        private draw() {
            this.clear();
            g_toolCtx.strokeStyle = "blue";
            g_toolCtx.setLineDash([5, 5]);
            g_toolCtx.strokeRect(this.getX(), this.getY(), this.getW(), this.getH());
        }
    }

    //------------------------------
    window.addEventListener("load", function() {
        g_canvas = document.getElementById("layoutbase");
        g_toolCanvas = document.getElementById("layouttool");

        g_ctx = g_canvas.getContext("2d");
        g_toolCtx = g_toolCanvas.getContext("2d");

        setTool(new RectTool());

        var watchCanvas = new InteractionHelper.Watch(g_toolCanvas, function(e) {
            g_tool.onPointer(e);
        });
    });
}
