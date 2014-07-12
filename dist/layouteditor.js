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

    var EPSILON = 0.01;
    var g_canvas = null;
    var g_ctx = null;
    var g_div = null;
    var g_toolCanvas = null;
    var g_toolCtx = null;

    function assert(cond) {
        if (!cond)
            debugger;
    }

    function extend(obj, props) {
        if (!obj)
            obj = {};
        for (var key in props) {
            if (props.hasOwnProperty(key))
                obj[key] = props[key];
        }
        return obj;
    }

    //------------------------------
    var Style = (function () {
        function Style() {
            this.strokeStyle = "black";
            this.fillStyle = "white";
            this.lineWidth = 1;
            this.lineDash = [];
        }
        Style.prototype.draw = function (ctx) {
            if (ctx.strokeStyle !== this.strokeStyle)
                ctx.strokeStyle = this.strokeStyle;
            if (ctx.fillStyle !== this.fillStyle)
                ctx.fillStyle = this.fillStyle;
            if (ctx.lineWidth !== this.lineWidth.toString())
                ctx.lineWidth = this.lineWidth.toString();
            ctx.setLineDash(this.lineDash);
        };
        return Style;
    })();
    var g_defaultStyle = new Style();
    var g_drawStyle = new Style();
    g_drawStyle.strokeStyle = "red";
    g_drawStyle.lineDash = [2, 2];
    g_drawStyle.fillStyle = "none";

    var g_style = g_defaultStyle;

    //------------------------------
    var Bounds = (function () {
        function Bounds() {
        }
        return Bounds;
    })();

    //------------------------------
    var Shape = (function () {
        function Shape() {
            this.style = g_defaultStyle;
            this.isDeleted = false;
            this.bounds = new Bounds();
        }
        Shape.prototype.setStyle = function (style) {
            this.style = style;
        };

        Shape.prototype.draw = function (ctx) {
            this.style.draw(ctx);
        };

        Shape.prototype.drawSelect = function (ctx) {
            ctx.strokeRect(this.bounds.x1, this.bounds.y1, this.bounds.x2 - this.bounds.x1, this.bounds.y2 - this.bounds.y1);
        };

        // performed by the derived class
        Shape.prototype.calculateBounds = function () {
        };

        Shape.prototype.isInsideXY = function (x, y) {
            return false;
        };

        Shape.prototype.clone = function (base) {
            if (!base)
                base = new Shape();
            extend(base, this);
            return base;
        };
        return Shape;
    })();

    var ShapeList = (function () {
        function ShapeList() {
            this.shapes = [];
            this.selectedShapes = [];
            this.selectedStyle = new Style();
            this.selectedStyle.strokeStyle = "blue";
            this.selectedStyle.fillStyle = "none";
            this.selectedStyle.lineWidth = 2;
            this.selectedStyle.lineDash = [5, 5];
        }
        ShapeList.prototype.addShape = function (shape) {
            shape.isDeleted = false;
            this.shapes.push(shape);
        };

        ShapeList.prototype.removeShape = function (shape) {
            shape.isDeleted = true;
        };

        ShapeList.prototype.toggleSelected = function (shape) {
            var index = this.selectedShapes.indexOf(shape);
            if (index === -1)
                this.selectedShapes.push(shape);
            else
                this.selectedShapes.splice(index, 1);
        };

        ShapeList.prototype.setSelectedShapes = function (shapes) {
            this.selectedShapes = shapes.slice(); // copy
        };

        ShapeList.prototype.getSelectedShapes = function () {
            return this.selectedShapes;
        };

        ShapeList.prototype.clearSelectedShapes = function () {
            this.selectedShapes.length = 0;
        };

        ShapeList.prototype.requestDraw = function () {
            var self = this;
            requestAnimationFrame(function () {
                self.draw(g_ctx);
                self.drawSelect(g_toolCtx);
            });
        };

        ShapeList.prototype.draw = function (ctx) {
            this.clear(ctx);

            // normal shapes
            var numShapes = this.shapes.length;
            for (var i = 0; i < numShapes; ++i) {
                var shape = this.shapes[i];
                if (!shape.isDeleted)
                    shape.draw(ctx);
            }
        };

        ShapeList.prototype.drawSelect = function (ctx) {
            this.selectedStyle.draw(ctx);
            this.clear(ctx);

            // selected shapes
            var numSelectedShapes = this.selectedShapes.length;
            for (var i = 0; i < numSelectedShapes; ++i) {
                var shape = this.selectedShapes[i];
                assert(!shape.isDeleted);
                shape.drawSelect(ctx);
            }
        };

        ShapeList.prototype.clear = function (ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        };

        ShapeList.prototype.getShapeXY = function (x, y) {
            for (var i = this.shapes.length - 1; i >= 0; --i) {
                var shape = this.shapes[i];
                if (shape.isInsideXY(x, y))
                    return shape;
            }

            return null;
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
            this.calculateBounds();
        }
        RectShape.prototype.draw = function (ctx) {
            _super.prototype.draw.call(this, ctx);

            if (this.style.fillStyle !== "none")
                ctx.fillRect(this.x, this.y, this.w, this.h);

            ctx.strokeRect(this.x, this.y, this.w, this.h);
        };

        RectShape.prototype.isInsideXY = function (x, y) {
            return x >= this.x && x < this.x + this.w && y >= this.y && y < this.y + this.h;
        };

        RectShape.prototype.clone = function (base) {
            if (!base)
                base = new RectShape(this.x, this.y, this.w, this.h);
            _super.prototype.clone.call(this, base);
            extend(base, this);
            return base;
        };

        RectShape.prototype.calculateBounds = function () {
            this.bounds.x1 = this.x;
            this.bounds.y1 = this.y;
            this.bounds.x2 = this.x + this.w;
            this.bounds.y2 = this.y + this.h;
        };
        return RectShape;
    })(Shape);

    var EllipseShape = (function (_super) {
        __extends(EllipseShape, _super);
        function EllipseShape(cx, cy, rx, ry) {
            _super.call(this);
            this.cx = cx;
            this.cy = cy;
            this.rx = rx;
            this.ry = ry;
            this.calculateBounds();
        }
        EllipseShape.prototype.draw = function (ctx) {
            if (this.rx < EPSILON && this.ry < EPSILON)
                return;

            _super.prototype.draw.call(this, ctx);

            // an ellipse is a scale circle
            var scaleX = 1;
            var scaleY = 1;
            var r = 0;
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
        };

        EllipseShape.prototype.isInsideXY = function (x, y) {
            var dx = (x - this.cx) / this.rx;
            var dy = (y - this.cy) / this.ry;
            return dx * dx + dy * dy < 1;
        };

        EllipseShape.prototype.clone = function (base) {
            if (!base)
                base = new EllipseShape(this.cx, this.cy, this.rx, this.ry);
            _super.prototype.clone.call(this, base);
            extend(base, this);
            return base;
        };

        EllipseShape.prototype.calculateBounds = function () {
            this.bounds.x1 = this.cx - this.rx;
            this.bounds.y1 = this.cy - this.ry;
            this.bounds.x2 = this.cx + this.rx;
            this.bounds.y2 = this.cy + this.ry;
        };
        return EllipseShape;
    })(Shape);

    

    var CommandList = (function () {
        function CommandList() {
            this.commands = [];
            this.currentIndex = 0;
        }
        CommandList.prototype.addCommand = function (command) {
            this.commands.length = this.currentIndex; // clip to the current undo level
            this.commands.push(command);
            this.currentIndex = this.commands.length; // past the end of the list
            command.redo();
        };

        CommandList.prototype.clear = function () {
            this.commands.length = 0;
        };

        CommandList.prototype.undo = function () {
            if (this.currentIndex <= 0)
                return;

            this.currentIndex--;
            this.commands[this.currentIndex].undo();
        };

        CommandList.prototype.redo = function () {
            if (this.currentIndex >= this.commands.length)
                return;

            this.commands[this.currentIndex].redo();
            this.currentIndex++;
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
            g_shapeList.requestDraw();
        };

        ShapeCommand.prototype.undo = function () {
            g_shapeList.removeShape(this.shape);
            g_shapeList.requestDraw();
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

    var EllipseCommand = (function (_super) {
        __extends(EllipseCommand, _super);
        function EllipseCommand(cx, cy, rx, ry) {
            _super.call(this);
            this.cx = cx;
            this.cy = cy;
            this.rx = rx;
            this.ry = ry;

            this.shape = new EllipseShape(this.cx, this.cy, this.rx, this.ry);
            this.shape.setStyle(g_style);
        }
        return EllipseCommand;
    })(ShapeCommand);

    var AlterShapeCommand = (function () {
        function AlterShapeCommand(shape, newShape) {
            this.shape = shape;
            this.newShape = newShape;
            this.originalShape = null;
            this.originalShape = shape.clone();
        }
        AlterShapeCommand.prototype.redo = function () {
            extend(this.shape, this.newShape);
            g_shapeList.requestDraw();
        };

        AlterShapeCommand.prototype.undo = function () {
            extend(this.shape, this.originalShape);
            g_shapeList.requestDraw();
        };
        return AlterShapeCommand;
    })();

    var SelectCommand = (function () {
        function SelectCommand(shape) {
            this.shape = shape;
            this.selectedShapes = [];
            this.selectedShapes = g_shapeList.getSelectedShapes().slice();
        }
        SelectCommand.prototype.redo = function () {
            g_shapeList.setSelectedShapes(this.selectedShapes);
            g_shapeList.toggleSelected(this.shape);
            g_shapeList.requestDraw();
        };

        SelectCommand.prototype.undo = function () {
            g_shapeList.setSelectedShapes(this.selectedShapes);
            g_shapeList.requestDraw();
        };
        return SelectCommand;
    })();

    
    var g_tool = null;

    function setTool(toolName) {
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

    var DrawTool = (function () {
        function DrawTool() {
            this.shape = null;
        }
        DrawTool.prototype.clear = function () {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        };

        DrawTool.prototype.draw = function () {
            this.clear();
            this.shape.draw(g_toolCtx);
        };

        DrawTool.prototype.onPointer = function (e) {
        };
        return DrawTool;
    })();

    var RectTool = (function (_super) {
        __extends(RectTool, _super);
        function RectTool() {
            _super.call(this);
            this.rectShape = new RectShape(0, 0, 0, 0);
            this.x1 = -1;
            this.y1 = -1;
            this.x2 = -1;
            this.y2 = -1;
            this.shape = this.rectShape;
            this.rectShape.style = g_drawStyle;
        }
        RectTool.prototype.onPointer = function (e) {
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
                    var newCommand = new RectCommand(this.rectShape.x, this.rectShape.y, this.rectShape.w, this.rectShape.h);
                    g_commandList.addCommand(newCommand);
                    break;
            }
        };

        RectTool.prototype.drawShape = function () {
            this.rectShape.x = Math.min(this.x1, this.x2);
            this.rectShape.y = Math.min(this.y1, this.y2);
            this.rectShape.w = Math.abs(this.x2 - this.x1);
            this.rectShape.h = Math.abs(this.y2 - this.y1);

            this.draw();
        };
        return RectTool;
    })(DrawTool);

    var EllipseTool = (function (_super) {
        __extends(EllipseTool, _super);
        function EllipseTool() {
            _super.call(this);
            this.ellipseShape = new EllipseShape(0, 0, 0, 0);
            this.shape = this.ellipseShape;
            this.ellipseShape.style = g_drawStyle;
        }
        EllipseTool.prototype.onPointer = function (e) {
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
                    var newCommand = new EllipseCommand(this.ellipseShape.cx, this.ellipseShape.cy, this.ellipseShape.rx, this.ellipseShape.ry);
                    g_commandList.addCommand(newCommand);
                    break;
            }
        };

        EllipseTool.prototype.drawShape = function () {
            this.ellipseShape.cx = (this.x1 + this.x2) * 0.5;
            this.ellipseShape.cy = (this.y1 + this.y2) * 0.5;
            this.ellipseShape.rx = (this.x2 - this.x1) * 0.5;
            this.ellipseShape.ry = (this.y2 - this.y1) * 0.5;
            this.draw();
        };
        return EllipseTool;
    })(DrawTool);

    var SelectTool = (function () {
        function SelectTool() {
        }
        SelectTool.prototype.onPointer = function (e) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    var shape = g_shapeList.getShapeXY(e.x, e.y);
                    if (shape)
                        g_commandList.addCommand(new SelectCommand(shape));
                    break;
            }
        };
        return SelectTool;
    })();

    //------------------------------
    function toolButtonClick(e) {
        setTool(e.target.id);
    }

    window.addEventListener("load", function () {
        g_canvas = document.getElementById("layoutbase");
        g_toolCanvas = document.getElementById("layouttool");

        g_ctx = g_canvas.getContext("2d");
        g_toolCtx = g_toolCanvas.getContext("2d");

        var toolElems = document.querySelectorAll(".tool");
        for (var i = 0; i < toolElems.length; ++i) {
            toolElems[i].addEventListener("click", toolButtonClick);
        }

        document.getElementById("undo").addEventListener("click", function () {
            g_commandList.undo();
        });
        document.getElementById("redo").addEventListener("click", function () {
            g_commandList.redo();
        });

        setTool("rect");

        var watchCanvas = new InteractionHelper.Watch(g_toolCanvas, function (e) {
            g_tool.onPointer(e);
        });
    });
})(LayoutEditor || (LayoutEditor = {}));
