// Copyright 2014 Reece Elliott
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="interactionhelper.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    "use strict";

    var g_canvas = null;
    var g_ctx = null;
    var g_div = null;
    var g_toolCanvas = null;
    var g_toolCtx = null;

    //------------------------------
    var Style = (function () {
        function Style() {
            this.strokeStyle = "black";
            this.fillStyle = "white";
            this.lineWidth = "1";
        }
        Style.prototype.draw = function (ctx) {
            if (ctx.strokeStyle !== this.strokeStyle)
                ctx.strokeStyle = this.strokeStyle;
            if (ctx.fillStyle !== this.fillStyle)
                ctx.fillStyle = this.fillStyle;
            if (ctx.lineWidth !== this.lineWidth)
                ctx.lineWidth = this.lineWidth;
        };
        return Style;
    })();
    var defaultStyle = new Style();
    var g_style = defaultStyle;

    //------------------------------
    var Shape = (function () {
        function Shape() {
            this.style = defaultStyle;
        }
        Shape.prototype.setStyle = function (style) {
            this.style = style;
        };

        Shape.prototype.draw = function (ctx) {
            this.style.draw(ctx);
        };
        return Shape;
    })();

    var ShapeList = (function () {
        function ShapeList() {
            this.shapes = [];
        }
        ShapeList.prototype.addShape = function (shape) {
            this.shapes.push(shape);
        };

        ShapeList.prototype.removeShape = function (shape) {
            var index = this.shapes.indexOf(shape);
            if (index !== -1)
                this.shapes.splice(index, 1);
            return index !== -1;
        };

        ShapeList.prototype.draw = function (ctx) {
            var numShapes = this.shapes.length;
            for (var i = 0; i < numShapes; ++i) {
                this.shapes[i].draw(ctx);
            }
        };

        ShapeList.prototype.clear = function (ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        };
        return ShapeList;
    })();
    var g_shapeList = new ShapeList();

    var RectShape = (function (_super) {
        __extends(RectShape, _super);
        function RectShape(x, y, w, h) {
            _super.call(this);
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;
        }
        RectShape.prototype.draw = function (ctx) {
            _super.prototype.draw.call(this, ctx);

            ctx.strokeRect(this.x, this.y, this.w, this.h);
        };
        return RectShape;
    })(Shape);

    

    var CommandList = (function () {
        function CommandList() {
            this.commands = [];
        }
        CommandList.prototype.addCommand = function (command) {
            this.commands.push(command);
            command.redo();
        };

        CommandList.prototype.removeCommand = function (command) {
            var index = this.commands.indexOf(command);
            if (index !== -1)
                this.commands.splice(index, 1);
            return index !== -1;
        };
        return CommandList;
    })();
    var g_commandList = new CommandList();

    var ShapeCommand = (function () {
        function ShapeCommand() {
            this.shape = null;
        }
        ShapeCommand.prototype.redo = function () {
            g_shapeList.addShape(this.shape);
            g_shapeList.clear(g_ctx);
            g_shapeList.draw(g_ctx);
        };

        ShapeCommand.prototype.undo = function () {
            g_shapeList.removeShape(this.shape);
            g_shapeList.clear(g_ctx);
            g_shapeList.draw(g_ctx);
        };
        return ShapeCommand;
    })();

    var RectCommand = (function (_super) {
        __extends(RectCommand, _super);
        function RectCommand(x, y, w, h) {
            _super.call(this);
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;

            this.shape = new RectShape(this.x, this.y, this.w, this.h);
            this.shape.setStyle(g_style);
        }
        return RectCommand;
    })(ShapeCommand);

    
    var g_tool = null;

    function setTool(tool) {
        g_tool = tool;
    }

    var RectTool = (function () {
        function RectTool() {
            this.x1 = -1;
            this.y1 = -1;
            this.x2 = -1;
            this.y2 = -1;
        }
        RectTool.prototype.getX = function () {
            return Math.min(this.x1, this.x2);
        };

        RectTool.prototype.getY = function () {
            return Math.min(this.y1, this.y2);
        };

        RectTool.prototype.getW = function () {
            return Math.abs(this.x1 - this.x2);
        };

        RectTool.prototype.getH = function () {
            return Math.abs(this.y1 - this.y2);
        };

        RectTool.prototype.onPointer = function (e) {
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
        };

        RectTool.prototype.clear = function () {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        };

        RectTool.prototype.draw = function () {
            this.clear();
            g_toolCtx.strokeStyle = "blue";
            g_toolCtx.setLineDash([5, 5]);
            g_toolCtx.strokeRect(this.getX(), this.getY(), this.getW(), this.getH());
        };
        return RectTool;
    })();

    //------------------------------
    window.addEventListener("load", function () {
        g_canvas = document.getElementById("layoutbase");
        g_toolCanvas = document.getElementById("layouttool");

        g_ctx = g_canvas.getContext("2d");
        g_toolCtx = g_toolCanvas.getContext("2d");

        setTool(new RectTool());

        var watchCanvas = new InteractionHelper.Watch(g_toolCanvas, function (e) {
            g_tool.onPointer(e);
        });
    });
})(LayoutEditor || (LayoutEditor = {}));
