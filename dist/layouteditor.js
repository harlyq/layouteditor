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

    function arrayMin(list, offset, stride) {
        if (typeof offset === "undefined") { offset = 0; }
        if (typeof stride === "undefined") { stride = 1; }
        if (list.length <= offset)
            return 0;

        var min = list[offset];
        for (var i = offset + stride; i < list.length; i += stride) {
            var val = list[i];
            if (val < min)
                min = val;
        }
        return min;
    }

    function arrayMax(list, offset, stride) {
        if (typeof offset === "undefined") { offset = 0; }
        if (typeof stride === "undefined") { stride = 1; }
        if (list.length <= offset)
            return 0;

        var max = list[offset];
        for (var i = offset + stride; i < list.length; i += stride) {
            var val = list[i];
            if (val > max)
                max = val;
        }
        return max;
    }

    function insertSortedUnique(list, value) {
        var numList = list.length;
        if (numList === 0)
            return list.splice(0, 0, value);

        var i = 0;
        var j = numList - 1;
        var mid = 0;
        var midValue = 0;
        do {
            mid = (i + j) >> 1;
            midValue = list[mid];
            if (value === midValue)
                return;

            if (value < midValue) {
                j = mid - 1;
            } else {
                i = mid + 1;
            }
        } while(i <= j);

        if (value < midValue)
            list.splice(mid, 0, value);
        else
            list.splice(mid + 1, 0, value);
    }

    function binarySearch(list, value) {
        var numList = list.length;
        if (numList === 0)
            return -1;

        var i = 0;
        var j = numList - 1;
        var mid = 0;
        var midValue = 0;
        do {
            mid = (i + j) >> 1;
            midValue = list[mid];
            if (value === midValue)
                return mid;

            if (value < midValue) {
                j = mid - 1;
            } else {
                i = mid + 1;
            }
        } while(i <= j);

        return mid;
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
        Bounds.prototype.toPolygon = function () {
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

            var lx = (x - this.pivot.x - this.translate.x) * this.scale.x;
            var ly = (y - this.pivot.y - this.translate.y) * this.scale.y;
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
                lx = (newPos.x * cr + newPos.y * sr) / (cr * cr + sr * sr);
                ly = (newPos.y - lx * sr) / cr;
            }

            lx /= this.scale.x;
            ly /= this.scale.y;

            return {
                x: lx,
                y: ly
            };
        };
        return Transform;
    })();

    //------------------------------
    var Shape = (function () {
        function Shape() {
            this.style = g_defaultStyle;
            this.isDeleted = false;
            this.oabb = new Bounds();
            this.aabb = new Bounds();
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
            var oabb = this.oabb;
            ctx.save();
            ctx.translate(oabb.cx, oabb.cy);
            ctx.rotate(oabb.rotate);
            ctx.strokeRect(-oabb.hw, -oabb.hh, oabb.hw * 2, oabb.hh * 2);
            ctx.restore();
        };

        Shape.prototype.drawAABB = function (ctx) {
            var aabb = this.aabb;
            ctx.strokeRect(aabb.cx - aabb.hw, aabb.cy - aabb.hh, aabb.hw * 2, aabb.hh * 2);
        };

        // performed by the derived class
        Shape.prototype.calculateBounds = function () {
        };

        Shape.prototype.isInsideXY = function (x, y) {
            this.buildPath(g_toolCtx);
            return g_toolCtx.isPointInPath(x, y);
        };

        Shape.prototype.isOverlapBounds = function (bounds) {
            var polygonA = this.aabb.toPolygon();
            var polygonB = bounds.toPolygon();

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

            var cx = transform.pivot.x + transform.translate.x;
            var cy = transform.pivot.y + transform.translate.y;
            ctx.strokeRect(cx - 2, cy - 2, 4, 4);

            ctx.save();

            // inverse order for ctx
            ctx.translate(transform.pivot.x + transform.translate.x, transform.pivot.y + transform.translate.y);
            ctx.rotate(transform.rotate);
            ctx.scale(transform.scale.x, transform.scale.y);

            //ctx.translate(transform.translate.x, transform.translate.y);
            ctx.beginPath();
            ctx.rect(-this.w * 0.5, -this.h * 0.5, this.w, this.h);
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
            var transform = this.transform;
            var dx = this.w * 0.5;
            var dy = this.h * 0.5;

            transform.pivot.x = this.x + dx;
            transform.pivot.y = this.y + dy;

            this.oabb.rotate = transform.rotate;
            this.oabb.hw = Math.abs(dx) * transform.scale.x;
            this.oabb.hh = Math.abs(dy) * transform.scale.y;
            this.oabb.cx = transform.pivot.x + transform.translate.x;
            this.oabb.cy = transform.pivot.y + transform.translate.y;

            var polygon = this.oabb.toPolygon();
            var x1 = arrayMin(polygon, 0, 2);
            var x2 = arrayMax(polygon, 0, 2);
            var y1 = arrayMin(polygon, 1, 2);
            var y2 = arrayMax(polygon, 1, 2);

            this.aabb.rotate = 0;
            this.aabb.hw = (x2 - x1) * 0.5;
            this.aabb.hh = (y2 - y1) * 0.5;
            this.aabb.cx = (x1 + x2) * 0.5;
            this.aabb.cy = (y1 + y2) * 0.5;
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
            ctx.translate(transform.pivot.x + transform.translate.x, transform.pivot.y + transform.translate.y);
            ctx.rotate(transform.rotate);
            ctx.scale(transform.scale.x, transform.scale.y);

            var kappa = .5522848, ox = rx * kappa, oy = ry * kappa;

            ctx.beginPath();
            ctx.moveTo(-rx, 0);
            ctx.bezierCurveTo(-rx, -oy, -ox, -ry, 0, -ry);
            ctx.bezierCurveTo(ox, -ry, rx, -oy, rx, 0);
            ctx.bezierCurveTo(rx, oy, ox, ry, 0, ry);
            ctx.bezierCurveTo(-ox, ry, -rx, oy, -rx, 0);

            // ctx.beginPath();
            // ctx.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI);
            ctx.restore();
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

            var hw = this.rx * transform.scale.x;
            var hh = this.ry * transform.scale.y;

            this.oabb.rotate = transform.rotate;
            this.oabb.hw = hw;
            this.oabb.hh = hh;
            this.oabb.cx = transform.pivot.x + transform.translate.x;
            this.oabb.cy = transform.pivot.y + transform.translate.y;

            this.aabb.rotate = 0;

            var rot = this.transform.rotate;
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
            var x1 = this.oabb.cx - this.oabb.hw;
            var y1 = this.oabb.cy - this.oabb.hh;
            ctx.rect(x1, y1, this.oabb.hw * 2, this.oabb.hh * 2);
        };

        AABBShape.prototype.calculateBounds = function () {
            var hw = (this.x2 - this.x1) * 0.5;
            var hh = (this.y2 - this.y1) * 0.5;

            this.oabb.rotate = 0;
            this.oabb.cx = this.x1 + hw;
            this.oabb.cy = this.y1 + hh;
            this.oabb.hw = Math.abs(hw);
            this.oabb.hh = Math.abs(hh);

            this.aabb = this.oabb;
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
                if (!shape.isDeleted && shape.isInsideXY(x, y))
                    return shape;
            }

            return null;
        };

        ShapeList.prototype.getShapesInBounds = function (bounds) {
            var shapes = [];

            for (var i = this.shapes.length - 1; i >= 0; --i) {
                var shape = this.shapes[i];
                if (!shape.isDeleted && shape.isOverlapBounds(bounds)) {
                    shape.isOverlapBounds(bounds);
                    shapes.push(shape);
                }
            }

            return shapes;
        };
        return ShapeList;
    })();
    var g_shapeList = new ShapeList();

    //------------------------------
    var Grid = (function () {
        function Grid() {
            this.snapToGrid = false;
            this.gridSize = 10;
            this.snapToShape = true;
            this.xTabs = [];
            this.yTabs = [];
            this.shapeGravity = 10;
            this.snapToX = -1;
            this.snapToY = -1;
        }
        Grid.prototype.getClosestIndex = function (list, value, index) {
            var bestDist = Math.abs(value - list[index]);
            var bestIndex = index;
            var leftIndex = index - 1;
            var rightIndex = index + 1;

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
        };

        Grid.prototype.snapXY = function (x, y) {
            var pos = {
                x: x,
                y: y
            };

            if (this.snapToGrid) {
                pos.x = pos.x % this.gridSize;
                pos.y = pos.y % this.gridSize;
            } else if (this.snapToShape) {
                var i = binarySearch(this.xTabs, pos.x);
                i = this.getClosestIndex(this.xTabs, pos.x, i);
                if (Math.abs(this.xTabs[i] - pos.x) < this.shapeGravity) {
                    pos.x = this.xTabs[i];
                    this.snapToX = pos.x;
                } else {
                    this.snapToX = -1;
                }

                var j = binarySearch(this.yTabs, pos.y);
                j = this.getClosestIndex(this.yTabs, pos.y, j);
                if (Math.abs(this.yTabs[j] - pos.y) < this.shapeGravity) {
                    pos.y = this.yTabs[j];
                    this.snapToY = pos.y;
                } else {
                    this.snapToY = -1;
                }
            }

            return pos;
        };

        Grid.prototype.rebuildTabs = function (excludeShapes) {
            if (typeof excludeShapes === "undefined") { excludeShapes = []; }
            if (!this.snapToShape)
                return;

            this.xTabs.length = 0;
            this.yTabs.length = 0;

            for (var i = 0; i < g_shapeList.shapes.length; ++i) {
                var shape = g_shapeList.shapes[i];
                if (excludeShapes.indexOf(shape) !== -1)
                    continue;

                var polygon = shape.aabb.toPolygon();
                var x1 = arrayMin(polygon, 0, 2);
                var x2 = arrayMax(polygon, 0, 2);
                var y1 = arrayMin(polygon, 1, 2);
                var y2 = arrayMax(polygon, 1, 2);
                var cx = (x1 + x2) * 0.5;
                var cy = (y1 + y2) * 0.5;

                insertSortedUnique(this.xTabs, x1);
                insertSortedUnique(this.xTabs, x2);
                insertSortedUnique(this.xTabs, cx);
                insertSortedUnique(this.yTabs, y1);
                insertSortedUnique(this.yTabs, y2);
                insertSortedUnique(this.yTabs, cy);
                // g_toolCtx.beginPath();
                // g_toolCtx.moveTo(x1, 0);
                // g_toolCtx.lineTo(x1, 1000);
                // g_toolCtx.stroke();
                // g_toolCtx.beginPath();
                // g_toolCtx.moveTo(x2, 0);
                // g_toolCtx.lineTo(x2, 1000);
                // g_toolCtx.stroke();
                // g_toolCtx.beginPath();
                // g_toolCtx.moveTo(cx, 0);
                // g_toolCtx.lineTo(cx, 1000);
                // g_toolCtx.stroke();
                // g_toolCtx.beginPath();
                // g_toolCtx.moveTo(0, y1);
                // g_toolCtx.lineTo(1000, y1);
                // g_toolCtx.stroke();
                // g_toolCtx.beginPath();
                // g_toolCtx.moveTo(0, y2);
                // g_toolCtx.lineTo(1000, y2);
                // g_toolCtx.stroke();
                // g_toolCtx.beginPath();
                // g_toolCtx.moveTo(0, cy);
                // g_toolCtx.lineTo(1000, cy);
                // g_toolCtx.stroke();
            }
        };
        return Grid;
    })();
    var g_grid = new Grid();

    

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
            this.shape.calculateBounds();
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
                    g_grid.rebuildTabs();
                    var pos = g_grid.snapXY(e.x, e.y);
                    this.x1 = pos.x;
                    this.y1 = pos.y;
                    break;

                case InteractionHelper.State.Move:
                    var pos = g_grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
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
                    g_grid.rebuildTabs();
                    var pos = g_grid.snapXY(e.x, e.y);
                    this.x1 = pos.x;
                    this.y1 = pos.y;
                    break;
                case InteractionHelper.State.Move:
                    var pos = g_grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
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
                    this.drawSelect();
                    break;
                case InteractionHelper.State.End:
                    this.clear();
                    var shapes = g_shapeList.getShapesInBounds(this.aabbShape.aabb);
                    if (shapes.length > 0)
                        g_commandList.addCommand(new SelectCommand(shapes));
                    break;
            }
        };

        SelectTool.prototype.clear = function () {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        };

        SelectTool.prototype.drawSelect = function () {
            this.clear();

            this.aabbShape.draw(g_toolCtx);

            g_shapeList.selectedStyle.draw(g_toolCtx);
            var shapes = g_shapeList.getShapesInBounds(this.aabbShape.aabb);
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
            this.startLocalPos = null;
        }
        ResizeTool.prototype.onPointer = function (e) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.shape = g_shapeList.getShapeInXY(e.x, e.y);
                    this.handle = 0 /* None */;

                    if (this.shape) {
                        this.resizeShape = this.shape.copy();
                        this.resizeShape.style = g_selectStyle;

                        var transform = this.shape.transform;
                        var localPos = transform.inv(e.x, e.y);
                        var oabb = this.shape.oabb;
                        var handleX = this.handleSize / transform.scale.x;
                        var handleY = this.handleSize / transform.scale.y;

                        if (localPos.x + oabb.hw < handleX)
                            this.handle = (this.handle | 1 /* Left */);
                        else if (oabb.hw - localPos.x < handleX)
                            this.handle = (this.handle | 2 /* Right */);

                        if (localPos.y + oabb.hh < handleY)
                            this.handle = (this.handle | 4 /* Top */);
                        else if (oabb.hh - localPos.y < handleY)
                            this.handle = (this.handle | 8 /* Bottom */);

                        if (this.handle === 0 /* None */)
                            this.handle = 16 /* Middle */;

                        this.startLocalPos = localPos;
                    }
                    break;

                case InteractionHelper.State.Move:
                    if (this.shape) {
                        var transform = this.resizeShape.transform;
                        var oldTransform = this.shape.transform;
                        var localPos = oldTransform.inv(e.x, e.y);
                        var dx = (localPos.x - this.startLocalPos.x) * oldTransform.scale.x;
                        var dy = (localPos.y - this.startLocalPos.y) * oldTransform.scale.y;
                        var sx = dx / (this.resizeShape.oabb.hw * 2);
                        var sy = dy / (this.resizeShape.oabb.hh * 2);
                        var cr = Math.cos(oldTransform.rotate);
                        var sr = Math.sin(oldTransform.rotate);

                        if (this.handle & 1 /* Left */) {
                            transform.translate.x = oldTransform.translate.x + dx * cr * 0.5;
                            transform.translate.y = oldTransform.translate.y + dx * sr * 0.5;
                            transform.scale.x = oldTransform.scale.x - sx;
                        }
                        if (this.handle & 2 /* Right */) {
                            transform.translate.x = oldTransform.translate.x + dx * cr * 0.5;
                            transform.translate.y = oldTransform.translate.y + dx * sr * 0.5;
                            transform.scale.x = oldTransform.scale.x + sx;
                        }
                        if (this.handle & 4 /* Top */) {
                            transform.translate.x = oldTransform.translate.x - dy * sr * 0.5;
                            transform.translate.y = oldTransform.translate.y + dy * cr * 0.5;
                            transform.scale.y = oldTransform.scale.y - sy;
                        }
                        if (this.handle & 8 /* Bottom */) {
                            transform.translate.x = oldTransform.translate.x - dy * sr * 0.5;
                            transform.translate.y = oldTransform.translate.y + dy * cr * 0.5;
                            transform.scale.y = oldTransform.scale.y + sy;
                        }
                        if (this.handle === 16 /* Middle */) {
                            transform.translate.x += e.deltaX;
                            transform.translate.y += e.deltaY;
                        }
                        this.canUse = this.handle !== 0 /* None */;
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
        };

        ResizeTool.prototype.clear = function () {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        };

        ResizeTool.prototype.drawResize = function () {
            this.clear();

            this.resizeShape.draw(g_toolCtx);
        };
        return ResizeTool;
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

    var RotateTool = (function () {
        function RotateTool() {
            this.shape = null;
            this.lastAngle = 0;
            this.rotateShape = null;
            this.pivot = {
                x: 0,
                y: 0
            };
        }
        RotateTool.prototype.onPointer = function (e) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.shape = g_shapeList.getShapeInXY(e.x, e.y);
                    if (this.shape) {
                        this.rotateShape = this.shape.copy();
                        this.rotateShape.style = g_selectStyle;
                        var transform = this.rotateShape.transform;
                        this.pivot.x = transform.pivot.x + transform.translate.x;
                        this.pivot.y = transform.pivot.y + transform.translate.y;
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

    var MoveTool = (function () {
        function MoveTool() {
            this.moveShape = null;
            this.shape = null;
            this.canUse = false;
        }
        MoveTool.prototype.onPointer = function (e) {
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
        };

        MoveTool.prototype.clear = function () {
            g_toolCtx.clearRect(0, 0, g_toolCanvas.width, g_toolCanvas.height);
        };

        MoveTool.prototype.drawMove = function () {
            this.clear();

            this.moveShape.draw(g_toolCtx);
            g_toolCtx.strokeStyle = "orange";
            this.moveShape.drawSelect(g_toolCtx);
            g_toolCtx.strokeStyle = "violet";
            this.moveShape.drawAABB(g_toolCtx);
        };
        return MoveTool;
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

        setTool("rectTool");

        var watchCanvas = new InteractionHelper.Watch(g_toolCanvas, function (e) {
            g_tool.onPointer(e);
        });
    });
})(LayoutEditor || (LayoutEditor = {}));
