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

    var EPSILON = 0.001;
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

    function arrayMin(list) {
        if (list.length === 0)
            return 0;

        var min = list[0];
        for (var i = list.length - 1; i > 0; --i) {
            var val = list[i];
            if (val < min)
                min = val;
        }
        return min;
    }

    function arrayMax(list) {
        if (list.length === 0)
            return 0;

        var max = list[0];
        for (var i = list.length - 1; i > 0; --i) {
            var val = list[i];
            if (val > max)
                max = val;
        }
        return max;
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
    var g_selectStyle = new Style();
    g_drawStyle.strokeStyle = "red";
    g_drawStyle.lineDash = [2, 2];
    g_drawStyle.fillStyle = "none";
    g_selectStyle.strokeStyle = "blue";
    g_selectStyle.lineDash = [5, 5];
    g_selectStyle.fillStyle = "none";

    var g_style = g_defaultStyle;

    //------------------------------
    var Bounds = (function () {
        function Bounds() {
            this.rotate = 0;
        }
        Bounds.prototype.asPolygon = function () {
            var cr = Math.cos(this.rotate);
            var sr = Math.sin(this.rotate);

            var polygon = [-this.hw, -this.hh, this.hw, -this.hh, this.hw, this.hh, -this.hw, this.hh];
            for (var i = 0; i < polygon.length; i += 2) {
                var x = polygon[i];
                var y = polygon[i + 1];
                polygon[i] = x * cr - y * sr + this.cx;
                polygon[i + 1] = x * sr + y * cr + this.cy;
            }

            return polygon;
        };
        return Bounds;
    })();

    function drawPolygon(ctx, polygon) {
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
    var Transform = (function () {
        function Transform() {
            this.rotate = 0;
            this.scale = {
                x: 1,
                y: 1
            };
            this.translate = {
                x: 0,
                y: 0
            };
            this.pivot = {
                x: 0,
                y: 0
            };
        }
        Transform.prototype.calc = function (x, y) {
            var newPos = {
                x: 0,
                y: 0
            };
            var sr = Math.sin(this.rotate);
            var cr = Math.cos(this.rotate);

            var lx = (x - this.pivot.x) * this.scale.x;
            var ly = (y - this.pivot.y) * this.scale.y;
            newPos.x = (lx * cr - ly * sr) + this.translate.x;
            newPos.y = (lx * sr + ly * cr) + this.translate.y;

            newPos.x += this.pivot.x;
            newPos.y += this.pivot.y;

            return newPos;
        };

        Transform.prototype.inv = function (x, y) {
            var newPos = {
                x: 0,
                y: 0
            };

            var sr = Math.sin(this.rotate);
            var cr = Math.cos(this.rotate);

            newPos.x = x - this.pivot.x - this.translate.x;
            newPos.y = y - this.pivot.y - this.translate.y;

            var lx = 0;
            var ly = 0;

            if (Math.abs(cr) < EPSILON) {
                lx = newPos.y / sr;
                ly = -newPos.x / sr;
            } else if (Math.abs(sr) < EPSILON) {
                lx = newPos.x / cr;
                ly = newPos.y / cr;
            } else {
                lx = (newPos.x * cr + newPos.y) / (cr * cr + sr);
                ly = (newPos.y - lx * sr) / cr;
            }

            return newPos;
        };
        return Transform;
    })();

    //------------------------------
    var Shape = (function () {
        function Shape() {
            this.style = g_defaultStyle;
            this.isDeleted = false;
            this.bounds = new Bounds();
            this.transform = new Transform();
        }
        Shape.prototype.setStyle = function (style) {
            this.style = style;
        };

        Shape.prototype.draw = function (ctx) {
            this.style.draw(ctx);

            this.buildPath(ctx);

            if (this.style.fillStyle !== "none")
                ctx.fill();
            ctx.stroke();
        };

        // implemented in the derived class
        Shape.prototype.buildPath = function (ctx) {
        };

        Shape.prototype.drawSelect = function (ctx) {
            ctx.save();
            ctx.translate(this.bounds.cx, this.bounds.cy);
            ctx.rotate(this.bounds.rotate);
            ctx.strokeRect(-this.bounds.hw, -this.bounds.hh, this.bounds.hw * 2, this.bounds.hh * 2);
            ctx.restore();
        };

        // performed by the derived class
        Shape.prototype.calculateBounds = function () {
        };

        Shape.prototype.isInsideXY = function (x, y) {
            this.buildPath(g_toolCtx);
            return g_toolCtx.isPointInPath(x, y);
        };

        Shape.prototype.isOverlapBounds = function (bounds) {
            var polygonA = this.bounds.asPolygon();
            var polygonB = bounds.asPolygon();

            for (var i = 0; i < 2; ++i) {
                var polygon = (i === 0 ? polygonA : polygonB);
                var x1 = polygon[polygon.length - 2];
                var y1 = polygon[polygon.length - 1];

                for (var j = 0; j < polygon.length; j += 2) {
                    var x2 = polygon[j];
                    var y2 = polygon[j + 1];
                    var normalX = y1 - y2;
                    var normalY = x2 - x1;
                    x1 = x2;
                    y1 = y2;

                    var minA;
                    var maxA;
                    for (var k = 0; k < polygonA.length; k += 2) {
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
                    for (var k = 0; k < polygonB.length; k += 2) {
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
        };

        Shape.prototype.copy = function (base) {
            if (!base)
                base = new Shape();
            extend(base, this);
            return base;
        };
        return Shape;
    })();

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
        RectShape.prototype.buildPath = function (ctx) {
            var transform = this.transform;

            ctx.save();
            ctx.scale(transform.scale.x, transform.scale.y);
            ctx.translate(transform.pivot.x, transform.pivot.y);
            ctx.rotate(transform.rotate);
            ctx.translate(transform.translate.x + this.x, transform.translate.y + this.y);

            ctx.beginPath();
            ctx.rect(-transform.pivot.x, -transform.pivot.y, this.w, this.h);
            ctx.restore();
        };

        RectShape.prototype.copy = function (base) {
            if (!base)
                base = new RectShape(this.x, this.y, this.w, this.h);
            _super.prototype.copy.call(this, base);
            extend(base, this);
            return base;
        };

        RectShape.prototype.calculateBounds = function () {
            this.transform.pivot.x = this.x + this.w * 0.5;
            this.transform.pivot.y = this.y + this.h * 0.5;

            // TODO fix for non-centered pivots
            this.bounds.rotate = this.transform.rotate;
            var hw = this.w * 0.5;
            var hh = this.h * 0.5;
            this.bounds.hw = Math.abs(hw);
            this.bounds.hh = Math.abs(hh);
            this.bounds.cx = this.x + hw;
            this.bounds.cy = this.y + hh;
        };
        return RectShape;
    })(Shape);

    var EllipseShape = (function (_super) {
        __extends(EllipseShape, _super);
        function EllipseShape(x, y, rx, ry) {
            _super.call(this);
            this.x = x;
            this.y = y;
            this.rx = rx;
            this.ry = ry;
            this.calculateBounds();
        }
        EllipseShape.prototype.buildPath = function (ctx) {
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
        };

        EllipseShape.prototype.copy = function (base) {
            if (!base)
                base = new EllipseShape(this.x, this.y, this.rx, this.ry);
            _super.prototype.copy.call(this, base);
            extend(base, this);
            return base;
        };

        EllipseShape.prototype.calculateBounds = function () {
            var transform = this.transform;
            transform.pivot.x = this.x + this.rx;
            transform.pivot.y = this.y + this.ry;

            // TODO fix for non-centered pivots
            this.bounds.rotate = this.transform.rotate;
            var hw = this.rx;
            var hh = this.ry;
            this.bounds.hw = Math.abs(hw);
            this.bounds.hh = Math.abs(hh);
            this.bounds.cx = this.x + hw;
            this.bounds.cy = this.y + hh;
        };
        return EllipseShape;
    })(Shape);

    // cannot transform!!!
    var AABBShape = (function (_super) {
        __extends(AABBShape, _super);
        function AABBShape() {
            _super.call(this);
        }
        AABBShape.prototype.copy = function (base) {
            if (!base)
                base = new AABBShape();
            _super.prototype.copy.call(this, base);
            extend(base, this);
            return base;
        };

        AABBShape.prototype.buildPath = function (ctx) {
            // don't apply transform!
            ctx.beginPath();
            var x1 = this.bounds.cx - this.bounds.hw;
            var y1 = this.bounds.cy - this.bounds.hh;
            ctx.rect(x1, y1, this.bounds.hw * 2, this.bounds.hh * 2);
        };

        AABBShape.prototype.calculateBounds = function () {
            this.transform.pivot.x = (this.x1 + this.x2) * 0.5;
            this.transform.pivot.y = (this.y1 + this.y2) * 0.5;
            var hw = (this.x2 - this.x1) * 0.5;
            var hh = (this.y2 - this.y1) * 0.5;
            this.bounds.cx = this.x1 + hw;
            this.bounds.cy = this.y1 + hh;
            this.bounds.hw = Math.abs(hw);
            this.bounds.hh = Math.abs(hh);
        };
        return AABBShape;
    })(Shape);

    //------------------------------
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

        ShapeList.prototype.toggleSelected = function (shapes) {
            for (var i = 0; i < shapes.length; ++i) {
                var shape = shapes[i];
                var index = this.selectedShapes.indexOf(shape);
                if (index === -1)
                    this.selectedShapes.push(shape);
                else
                    this.selectedShapes.splice(index, 1);
            }
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

        ShapeList.prototype.getShapeInXY = function (x, y) {
            for (var i = this.shapes.length - 1; i >= 0; --i) {
                var shape = this.shapes[i];
                if (shape.isInsideXY(x, y))
                    return shape;
            }

            return null;
        };

        ShapeList.prototype.getShapesInBounds = function (bounds) {
            var shapes = [];

            for (var i = this.shapes.length - 1; i >= 0; --i) {
                var shape = this.shapes[i];
                if (shape.isOverlapBounds(bounds)) {
                    shape.isOverlapBounds(bounds);
                    shapes.push(shape);
                }
            }

            return shapes;
        };
        return ShapeList;
    })();
    var g_shapeList = new ShapeList();

    

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
        function EllipseCommand(x, y, rx, ry) {
            _super.call(this);
            this.x = x;
            this.y = y;
            this.rx = rx;
            this.ry = ry;

            this.shape = new EllipseShape(this.x, this.y, this.rx, this.ry);
            this.shape.setStyle(g_style);
        }
        return EllipseCommand;
    })(ShapeCommand);

    var TransformCommand = (function () {
        function TransformCommand(shape, transform) {
            this.shape = shape;
            this.transform = transform;
            this.originalTransform = new Transform();
            extend(this.originalTransform, shape.transform);
        }
        TransformCommand.prototype.redo = function () {
            extend(this.shape.transform, this.transform);
            this.shape.calculateBounds();
            g_shapeList.requestDraw();
        };

        TransformCommand.prototype.undo = function () {
            extend(this.shape.transform, this.originalTransform);
            this.shape.calculateBounds();
            g_shapeList.requestDraw();
        };
        return TransformCommand;
    })();

    var SelectCommand = (function () {
        function SelectCommand(shapes) {
            this.shapes = shapes;
            this.selectedShapes = [];
            this.selectedShapes = g_shapeList.getSelectedShapes().slice();
        }
        SelectCommand.prototype.redo = function () {
            g_shapeList.setSelectedShapes(this.selectedShapes);
            g_shapeList.toggleSelected(this.shapes);
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

    var TemplateTool = (function () {
        function TemplateTool() {
        }
        TemplateTool.prototype.onPointer = function (e) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    break;
                case InteractionHelper.State.Move:
                    break;
                case InteractionHelper.State.End:
                    break;
            }
        };
        return TemplateTool;
    })();

    var DrawTool = (function () {
        function DrawTool() {
            this.shape = null;
            this.canUse = false;
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
                    this.canUse = true;
                    this.drawShape();
                    break;
                case InteractionHelper.State.End:
                    this.clear();
                    if (this.canUse) {
                        var newCommand = new RectCommand(this.rectShape.x, this.rectShape.y, this.rectShape.w, this.rectShape.h);
                        g_commandList.addCommand(newCommand);
                        this.canUse = false;
                    }
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
                    this.canUse = true;
                    this.drawShape();
                    break;
                case InteractionHelper.State.End:
                    this.clear();
                    if (this.canUse) {
                        var newCommand = new EllipseCommand(this.ellipseShape.x, this.ellipseShape.y, this.ellipseShape.rx, this.ellipseShape.ry);
                        g_commandList.addCommand(newCommand);
                        this.canUse = false;
                    }
                    break;
            }
        };

        EllipseTool.prototype.drawShape = function () {
            this.ellipseShape.x = this.x1;
            this.ellipseShape.y = this.y1;
            this.ellipseShape.rx = (this.x2 - this.x1) * 0.5;
            this.ellipseShape.ry = (this.y2 - this.y1) * 0.5;
            this.draw();
        };
        return EllipseTool;
    })(DrawTool);

    var SelectTool = (function () {
        function SelectTool() {
            this.aabbShape = new AABBShape();
            this.aabbShape.style = g_selectStyle;
        }
        SelectTool.prototype.onPointer = function (e) {
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
                    this.drawBounds();
                    break;
                case InteractionHelper.State.End:
                    this.clear();
                    var shapes = g_shapeList.getShapesInBounds(this.aabbShape.bounds);
                    if (shapes.length > 0)
                        g_commandList.addCommand(new SelectCommand(shapes));
                    break;
            }
        };

        SelectTool.prototype.clear = function () {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        };

        SelectTool.prototype.drawBounds = function () {
            this.clear();

            this.aabbShape.draw(g_toolCtx);

            g_shapeList.selectedStyle.draw(g_toolCtx);
            var shapes = g_shapeList.getShapesInBounds(this.aabbShape.bounds);
            for (var i = 0; i < shapes.length; ++i) {
                shapes[i].drawSelect(g_toolCtx);
            }
        };
        return SelectTool;
    })();

    var ResizeTool = (function () {
        function ResizeTool() {
            this.resizeShape = null;
            this.shape = null;
            this.handle = 0 /* None */;
            this.handleSize = 20;
            this.canUse = false;
            this.resizeShape.style = g_selectStyle;
        }
        ResizeTool.prototype.onPointer = function (e) {
            // switch (e.state) {
            //     case InteractionHelper.State.Start:
            //         this.shape = g_shapeList.getShapeInXY(e.x, e.y);
            //         this.handle = ResizeTool.HandleFlag.None;
            //         if (this.shape) {
            //             this.resizeShape = this.shape.copy();
            //             this.resizeShape.style = g_selectStyle;
            //             var localPos: XY = this.shape.transform.inv(e.x, e.y);
            //             var x1 = this.shape.bounds.x1;
            //             var y1 = this.shape.bounds.y1;
            //             var x2 = this.shape.bounds.x2;
            //             var y2 = this.shape.bounds.y2;
            //             if (localPos.x - x1 < this.handleSize)
            //                 this.handle = (this.handle | ResizeTool.HandleFlag.Left);
            //             else if (x2 - localPos.x < this.handleSize)
            //                 this.handle = (this.handle | ResizeTool.HandleFlag.Right);
            //             if (localPos.y - y1 < this.handleSize)
            //                 this.handle = (this.handle | ResizeTool.HandleFlag.Top);
            //             else if (y2 - localPos.y < this.handleSize)
            //                 this.handle = (this.handle | ResizeTool.HandleFlag.Bottom);
            //             if (this.handle === ResizeTool.HandleFlag.None)
            //                 this.handle = ResizeTool.HandleFlag.Middle;
            //             this.aabbShape.x1 = x1;
            //             this.aabbShape.y1 = y1;
            //             this.aabbShape.x2 = x2;
            //             this.aabbShape.y2 = y2;
            //         }
            //         break;
            //     case InteractionHelper.State.Move:
            //         // var cr = Math.cos(this.rotate);
            //         // var sr = Math.sin(this.rotate);
            //         if (this.handle & ResizeTool.HandleFlag.Left)
            //             this.aabbShape.x1 += e.deltaX;
            //         if (this.handle & ResizeTool.HandleFlag.Right)
            //             this.aabbShape.x2 += e.deltaX;
            //         if (this.handle & ResizeTool.HandleFlag.Top)
            //             this.aabbShape.y1 += e.deltaY;
            //         if (this.handle & ResizeTool.HandleFlag.Bottom)
            //             this.aabbShape.y2 += e.deltaY;
            //         if (this.handle === ResizeTool.HandleFlag.Middle) {
            //             this.aabbShape.x1 += e.deltaX;
            //             this.aabbShape.y1 += e.deltaY;
            //             this.aabbShape.x2 += e.deltaX;
            //             this.aabbShape.y2 += e.deltaY;
            //         }
            //         this.canUse = this.handle !== ResizeTool.HandleFlag.None;
            //         this.drawBounds();
            //         break;
            //     case InteractionHelper.State.End:
            //         if (this.canUse) {
            //             //var newCommand = new TransformCommand();
            //             this.canUse = false;
            //         }
            //         this.shape = null;
            //         break;
            // }
        };

        ResizeTool.prototype.clear = function () {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        };

        ResizeTool.prototype.drawBounds = function () {
            this.clear();

            this.resizeShape.calculateBounds();
            this.resizeShape.draw(g_toolCtx);
        };
        return ResizeTool;
    })();

    var RotateTool = (function () {
        function RotateTool() {
            this.shape = null;
            this.lastAngle = 0;
            this.rotateShape = null;
        }
        RotateTool.prototype.onPointer = function (e) {
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
        };

        RotateTool.prototype.clear = function () {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        };

        RotateTool.prototype.drawRotate = function () {
            this.clear();

            this.rotateShape.calculateBounds();
            this.rotateShape.draw(g_toolCtx);
        };

        RotateTool.prototype.getAngle = function (x, y, pivot) {
            var dy = y - pivot.y;
            var dx = x - pivot.x;
            if (Math.abs(dy) < EPSILON && Math.abs(dx) < EPSILON)
                return 0;

            return Math.atan2(dy, dx);
        };
        return RotateTool;
    })();

    var ResizeTool;
    (function (ResizeTool) {
        (function (HandleFlag) {
            HandleFlag[HandleFlag["None"] = 0] = "None";
            HandleFlag[HandleFlag["Left"] = 1] = "Left";
            HandleFlag[HandleFlag["Right"] = 2] = "Right";
            HandleFlag[HandleFlag["Top"] = 4] = "Top";
            HandleFlag[HandleFlag["Bottom"] = 8] = "Bottom";
            HandleFlag[HandleFlag["Middle"] = 16] = "Middle";
        })(ResizeTool.HandleFlag || (ResizeTool.HandleFlag = {}));
        var HandleFlag = ResizeTool.HandleFlag;
        ;
    })(ResizeTool || (ResizeTool = {}));

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

        setTool("rectTool");

        var watchCanvas = new InteractionHelper.Watch(g_toolCanvas, function (e) {
            g_tool.onPointer(e);
        });
    });
})(LayoutEditor || (LayoutEditor = {}));
