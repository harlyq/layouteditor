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

    function getIndexOfSorted(list, value) {
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
    var PanZoom = (function () {
        function PanZoom() {
            this.pan = {
                x: 0,
                y: 0
            };
            this.zoom = 1;
            // raw input values
            this.x = 0;
            this.y = 0;
            this.deltaX = 0;
            this.deltaY = 0;
            this.pinchDistance = 0;
        }
        PanZoom.prototype.reset = function () {
            this.constructor();
        };

        PanZoom.prototype.toX = function (x) {
            return (x - this.pan.x) / this.zoom;
        };
        PanZoom.prototype.toY = function (y) {
            return (y - this.pan.y) / this.zoom;
        };
        PanZoom.prototype.toH = function (h) {
            return h / this.zoom;
        };
        PanZoom.prototype.toW = function (w) {
            return w / this.zoom;
        };

        PanZoom.prototype.calcXY = function (x, y) {
            var newPos = {
                x: 0,
                y: 0
            };
            newPos.x = x * this.zoom + this.pan.x;
            newPos.y = y * this.zoom + this.pan.y;
            return newPos;
        };

        PanZoom.prototype.invXY = function (x, y) {
            var invPos = {
                x: 0,
                y: 0
            };
            invPos.x = (x - this.pan.x) / this.zoom;
            invPos.y = (y - this.pan.y) / this.zoom;
            return invPos;
        };

        PanZoom.prototype.translate = function (ctx, x, y) {
            ctx.translate(x * this.zoom + this.pan.x, y * this.zoom + this.pan.y);
        };

        PanZoom.prototype.scale = function (ctx, x, y) {
            ctx.scale(x * this.zoom, y * this.zoom);
        };

        PanZoom.prototype.transform = function (ctx, translateX, translateY, rotate, scaleX, scaleY) {
            if (typeof translateX === "undefined") { translateX = 0; }
            if (typeof translateY === "undefined") { translateY = 0; }
            if (typeof rotate === "undefined") { rotate = 0; }
            if (typeof scaleX === "undefined") { scaleX = 1; }
            if (typeof scaleY === "undefined") { scaleY = 1; }
            ctx.translate(translateX * this.zoom + this.pan.x, translateY * this.zoom + this.pan.y);
            ctx.rotate(rotate);
            ctx.scale(scaleX * this.zoom, scaleY * this.zoom);
        };

        PanZoom.prototype.save = function () {
            return {
                type: "PanZoom",
                pan: {
                    x: this.pan.x,
                    y: this.pan.y
                },
                zoom: this.zoom
            };
        };

        PanZoom.prototype.load = function (obj) {
            assert(obj.type === "PanZoom");
            this.reset();
            extend(this, obj);
        };
        return PanZoom;
    })();
    var g_panZoom = new PanZoom();

    //------------------------------
    var Style = (function () {
        function Style() {
            this.strokeStyle = "black";
            this.fillStyle = "none";
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
    var g_snapStyle = new Style();
    g_defaultStyle.fillStyle = "white";
    g_drawStyle.strokeStyle = "red";
    g_drawStyle.lineDash = [2, 2];
    g_selectStyle.strokeStyle = "blue";
    g_selectStyle.lineDash = [5, 5];
    g_snapStyle.strokeStyle = "red";

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
        }
        Transform.prototype.calc = function (x, y) {
            var newPos = {
                x: 0,
                y: 0
            };
            var sr = Math.sin(this.rotate);
            var cr = Math.cos(this.rotate);

            var lx = (x - this.translate.x) * this.scale.x;
            var ly = (y - this.translate.y) * this.scale.y;
            newPos.x = (lx * cr - ly * sr) + this.translate.x;
            newPos.y = (lx * sr + ly * cr) + this.translate.y;

            return newPos;
        };

        Transform.prototype.inv = function (x, y) {
            var newPos = {
                x: 0,
                y: 0
            };

            var sr = Math.sin(this.rotate);
            var cr = Math.cos(this.rotate);

            newPos.x = x - this.translate.x;
            newPos.y = y - this.translate.y;

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
            g_panZoom.transform(ctx, oabb.cx, oabb.cy, oabb.rotate);
            ctx.beginPath();
            ctx.rect(-oabb.hw, -oabb.hh, oabb.hw * 2, oabb.hh * 2);
            ctx.restore();
            ctx.stroke();
        };

        Shape.prototype.drawAABB = function (ctx) {
            var aabb = this.aabb;
            ctx.save();
            g_panZoom.transform(ctx);
            ctx.beginPath();
            ctx.rect(aabb.cx - aabb.hw, aabb.cy - aabb.hh, aabb.hw * 2, aabb.hh * 2);
            ctx.restore();
            ctx.stroke();
        };

        // performed by the derived class
        Shape.prototype.calculateBounds = function () {
        };

        Shape.prototype.isInsideXY = function (x, y) {
            var u = x * g_panZoom.zoom + g_panZoom.pan.x;
            var v = y * g_panZoom.zoom + g_panZoom.pan.y;

            this.buildPath(g_toolCtx);
            return g_toolCtx.isPointInPath(u, v);
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

        Shape.prototype.save = function () {
            return {
                transform: this.transform
            };
        };

        Shape.prototype.load = function (obj) {
            extend(this.transform, obj.transform);
        };
        return Shape;
    })();

    var RectShape = (function (_super) {
        __extends(RectShape, _super);
        function RectShape(w, h) {
            _super.call(this);
            this.w = w;
            this.h = h;
        }
        RectShape.prototype.buildPath = function (ctx) {
            var transform = this.transform;

            ctx.save();
            g_panZoom.transform(ctx, transform.translate.x, transform.translate.y, transform.rotate, transform.scale.x, transform.scale.y);

            ctx.beginPath();
            ctx.rect(-this.w * 0.5, -this.h * 0.5, this.w, this.h);
            ctx.restore();
        };

        RectShape.prototype.copy = function (base) {
            if (!base)
                base = new RectShape(this.w, this.h);
            _super.prototype.copy.call(this, base);
            extend(base, this);
            return base;
        };

        RectShape.prototype.fromRect = function (x, y, w, h) {
            this.transform.translate.x = x + w * 0.5;
            this.transform.translate.y = y + h * 0.5;
            this.w = w;
            this.h = h;
            this.calculateBounds();
        };

        RectShape.prototype.calculateBounds = function () {
            var transform = this.transform;
            var dx = this.w * 0.5;
            var dy = this.h * 0.5;

            this.oabb.rotate = transform.rotate;
            this.oabb.hw = Math.abs(dx) * transform.scale.x;
            this.oabb.hh = Math.abs(dy) * transform.scale.y;
            this.oabb.cx = transform.translate.x;
            this.oabb.cy = transform.translate.y;

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

        RectShape.prototype.save = function () {
            var obj = _super.prototype.save.call(this);
            obj.type = "RectShape";
            obj.w = this.w;
            obj.h = this.h;
            return obj;
        };

        RectShape.prototype.load = function (obj) {
            assert(obj.type === "RectShape");
            this.w = obj.w;
            this.h = obj.h;
            _super.prototype.load.call(this, obj);
        };
        return RectShape;
    })(Shape);

    var EllipseShape = (function (_super) {
        __extends(EllipseShape, _super);
        function EllipseShape(rx, ry) {
            _super.call(this);
            this.rx = rx;
            this.ry = ry;
        }
        EllipseShape.prototype.buildPath = function (ctx) {
            var transform = this.transform;
            var rx = Math.abs(this.rx);
            var ry = Math.abs(this.ry);

            ctx.save();
            g_panZoom.transform(ctx, transform.translate.x, transform.translate.y, transform.rotate, transform.scale.x, transform.scale.y);

            var kappa = .5522848, ox = rx * kappa, oy = ry * kappa;

            ctx.beginPath();
            ctx.moveTo(-rx, 0);
            ctx.bezierCurveTo(-rx, -oy, -ox, -ry, 0, -ry);
            ctx.bezierCurveTo(ox, -ry, rx, -oy, rx, 0);
            ctx.bezierCurveTo(rx, oy, ox, ry, 0, ry);
            ctx.bezierCurveTo(-ox, ry, -rx, oy, -rx, 0);

            // ctx.beginPath();
            // ctx.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI);    chrome only
            ctx.restore();
        };

        EllipseShape.prototype.copy = function (base) {
            if (!base)
                base = new EllipseShape(this.rx, this.ry);
            _super.prototype.copy.call(this, base);
            extend(base, this);
            return base;
        };

        EllipseShape.prototype.fromRect = function (x, y, w, h) {
            this.transform.translate.x = x + w * 0.5;
            this.transform.translate.y = y + h * 0.5;
            this.rx = w * 0.5;
            this.ry = h * 0.5;
            this.calculateBounds();
        };

        EllipseShape.prototype.calculateBounds = function () {
            var transform = this.transform;

            var hw = this.rx * transform.scale.x;
            var hh = this.ry * transform.scale.y;

            this.oabb.rotate = transform.rotate;
            this.oabb.hw = hw;
            this.oabb.hh = hh;
            this.oabb.cx = transform.translate.x;
            this.oabb.cy = transform.translate.y;

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

        EllipseShape.prototype.save = function () {
            var obj = _super.prototype.save.call(this);
            obj.type = "EllipseShape";
            obj.rx = this.rx;
            obj.ry = this.ry;
            return obj;
        };

        EllipseShape.prototype.load = function (obj) {
            assert(obj.type === "EllipseShape");
            this.rx = obj.rx;
            this.ry = obj.ry;
            _super.prototype.load.call(this, obj);
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
            var x1 = this.oabb.cx - this.oabb.hw;
            var y1 = this.oabb.cy - this.oabb.hh;
            ctx.save();
            g_panZoom.transform(ctx);
            ctx.beginPath();
            ctx.rect(x1, y1, this.oabb.hw * 2, this.oabb.hh * 2);
            ctx.restore();
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

        AABBShape.prototype.save = function () {
            var obj = _super.prototype.save.call(this);
            obj.type = "AABBShape";
            obj.x1 = this.x1;
            obj.y1 = this.y1;
            obj.x2 = this.x2;
            obj.y2 = this.y2;
            return obj;
        };

        AABBShape.prototype.load = function (obj) {
            assert(obj.type === "AABBShape");
            this.x1 = obj.x1;
            this.y1 = obj.y1;
            this.x2 = obj.x2;
            this.y2 = obj.y2;
            _super.prototype.load.call(this, obj);
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
        ShapeList.prototype.reset = function () {
            this.shapes.length = 0;
            this.selectedShapes.length = 0;
        };

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

        ShapeList.prototype.create = function (type) {
            switch (type) {
                case "RectShape":
                    return new RectShape(0, 0);
                case "EllipseShape":
                    return new EllipseShape(0, 0);
                case "AABBShape":
                    return new AABBShape();
            }
        };

        ShapeList.prototype.save = function () {
            var obj = {
                shapes: []
            };
            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                if (!shape.isDeleted) {
                    obj.shapes.push(shape.save());
                }
            }
            return obj;
        };

        ShapeList.prototype.load = function (obj) {
            this.reset();
            for (var i = 0; i < obj.shapes.length; ++i) {
                var shapeSave = obj.shapes[i];
                var newShape = this.create(shapeSave.type);
                newShape.load(shapeSave);
                newShape.calculateBounds();
                g_shapeList.addShape(newShape);
            }
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
            this.snappedX = -1;
            this.snappedY = -1;
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
                var i = getIndexOfSorted(this.xTabs, pos.x);
                i = this.getClosestIndex(this.xTabs, pos.x, i);
                if (Math.abs(this.xTabs[i] - pos.x) < this.shapeGravity) {
                    pos.x = this.xTabs[i];
                    this.snappedX = pos.x;
                } else {
                    this.snappedX = -1;
                }

                var j = getIndexOfSorted(this.yTabs, pos.y);
                j = this.getClosestIndex(this.yTabs, pos.y, j);
                if (Math.abs(this.yTabs[j] - pos.y) < this.shapeGravity) {
                    pos.y = this.yTabs[j];
                    this.snappedY = pos.y;
                } else {
                    this.snappedY = -1;
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
                if (shape.isDeleted || excludeShapes.indexOf(shape) !== -1)
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
            }
            // ctx.save();
            // g_panZoom.transform(g_toolCtx);
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
            // ctx.restore();
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

        CommandList.prototype.reset = function () {
            this.commands.length = 0;
            this.currentIndex = 0;
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
        function RectCommand(cx, cy, w, h) {
            _super.call(this);

            this.shape = new RectShape(w, h);
            this.shape.transform.translate.x = cx;
            this.shape.transform.translate.y = cy;
            this.shape.setStyle(g_style);
            this.shape.calculateBounds();
        }
        return RectCommand;
    })(ShapeCommand);

    var EllipseCommand = (function (_super) {
        __extends(EllipseCommand, _super);
        function EllipseCommand(cx, cy, rx, ry) {
            _super.call(this);

            this.shape = new EllipseShape(rx, ry);
            this.shape.transform.translate.x = cx;
            this.shape.transform.translate.y = cy;
            this.shape.setStyle(g_style);
            this.shape.calculateBounds();
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

            case "panZoomTool":
                g_tool = new PanZoomTool();
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
            this.rectShape = new RectShape(0, 0);
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
                        var newCommand = new RectCommand(this.rectShape.transform.translate.x, this.rectShape.transform.translate.y, this.rectShape.w, this.rectShape.h);
                        g_commandList.addCommand(newCommand);
                        this.canUse = false;
                    }
                    break;
            }
        };

        RectTool.prototype.drawShape = function () {
            this.rectShape.fromRect(Math.min(this.x1, this.x2), Math.min(this.y1, this.y2), Math.abs(this.x2 - this.x1), Math.abs(this.y2 - this.y1));

            this.draw();

            if (g_grid.snappedX > -1 || g_grid.snappedY > -1) {
                g_toolCtx.save();
                g_panZoom.transform(g_toolCtx);
                g_toolCtx.beginPath();
                g_snapStyle.draw(g_toolCtx);
                g_toolCtx.moveTo(g_grid.snappedX, 0);
                g_toolCtx.lineTo(g_grid.snappedX, 1000);
                g_toolCtx.moveTo(0, g_grid.snappedY);
                g_toolCtx.lineTo(1000, g_grid.snappedY);
                g_toolCtx.stroke();
                g_toolCtx.restore();
            }
        };
        return RectTool;
    })(DrawTool);

    var EllipseTool = (function (_super) {
        __extends(EllipseTool, _super);
        function EllipseTool() {
            _super.call(this);
            this.ellipseShape = new EllipseShape(0, 0);
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
                        var newCommand = new EllipseCommand(this.ellipseShape.transform.translate.x, this.ellipseShape.transform.translate.y, this.ellipseShape.rx, this.ellipseShape.ry);
                        g_commandList.addCommand(newCommand);
                        this.canUse = false;
                    }
                    break;
            }
        };

        EllipseTool.prototype.drawShape = function () {
            this.ellipseShape.fromRect(Math.min(this.x1, this.x2), Math.min(this.y1, this.y2), Math.abs(this.x2 - this.x1), Math.abs(this.y2 - this.y1));
            this.draw();

            if (g_grid.snappedX > -1 || g_grid.snappedY > -1) {
                g_toolCtx.save();
                g_panZoom.transform(g_toolCtx);
                g_toolCtx.beginPath();
                g_snapStyle.draw(g_toolCtx);
                g_toolCtx.moveTo(g_grid.snappedX, 0);
                g_toolCtx.lineTo(g_grid.snappedX, 1000);
                g_toolCtx.moveTo(0, g_grid.snappedY);
                g_toolCtx.lineTo(1000, g_grid.snappedY);
                g_toolCtx.stroke();
                g_toolCtx.restore();
            }
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
                        g_grid.rebuildTabs();
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
            this.deltaX = 0;
            this.deltaY = 0;
            this.snappedX = 0;
            this.snappedY = 0;
        }
        MoveTool.prototype.onPointer = function (e) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.shape = g_shapeList.getShapeInXY(e.x, e.y);

                    if (this.shape) {
                        this.moveShape = this.shape.copy();
                        this.moveShape.style = g_selectStyle;
                        this.deltaX = 0;
                        this.deltaY = 0;
                    }
                    break;

                case InteractionHelper.State.Move:
                    if (this.shape) {
                        var transform = this.moveShape.transform;
                        var oldTransform = this.shape.transform;

                        this.deltaX += e.deltaX;
                        this.deltaY += e.deltaY;
                        transform.translate.x = oldTransform.translate.x + this.deltaX;
                        transform.translate.y = oldTransform.translate.y + this.deltaY;

                        this.snapAABBToGrid();
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

            if (this.snappedX > -1 || this.snappedY > -1) {
                g_toolCtx.save();
                g_panZoom.transform(g_toolCtx);
                g_toolCtx.beginPath();
                g_snapStyle.draw(g_toolCtx);
                g_toolCtx.moveTo(this.snappedX, 0);
                g_toolCtx.lineTo(this.snappedX, 1000);
                g_toolCtx.moveTo(0, this.snappedY);
                g_toolCtx.lineTo(1000, this.snappedY);
                g_toolCtx.stroke();
                g_toolCtx.restore();
            }
        };

        MoveTool.prototype.snapAABBToGrid = function () {
            this.moveShape.calculateBounds();

            var aabb = this.moveShape.aabb;
            var translate = this.moveShape.transform.translate;

            var left = aabb.cx - aabb.hw;
            var top = aabb.cy - aabb.hh;
            var right = aabb.cx + aabb.hw;
            var bottom = aabb.cy + aabb.hh;

            var snapTopLeft = g_grid.snapXY(left, top);
            var snapBottomRight = g_grid.snapXY(right, bottom);
            var snapCenter = g_grid.snapXY(aabb.cx, aabb.cy);

            this.snappedX = -1;
            if (left !== snapTopLeft.x) {
                translate.x += snapTopLeft.x - left;
                this.snappedX = snapTopLeft.x;
            } else if (right !== snapBottomRight.x) {
                translate.x += snapBottomRight.x - right;
                this.snappedX = snapBottomRight.x;
            } else if (aabb.cx !== snapCenter.x) {
                translate.x += snapCenter.x - aabb.cx;
                this.snappedX = snapCenter.x;
            }

            this.snappedY = -1;
            if (top !== snapTopLeft.y) {
                translate.y += snapTopLeft.y - top;
                this.snappedY = snapTopLeft.y;
            } else if (bottom !== snapBottomRight.y) {
                translate.y += snapBottomRight.y - bottom;
                this.snappedY = snapBottomRight.y;
            } else if (aabb.cy !== snapCenter.y) {
                translate.y += snapCenter.y - aabb.cy;
                this.snappedY = snapCenter.y;
            }

            if (this.snappedY >= 1 || this.snappedX >= -1)
                this.moveShape.calculateBounds();
        };
        return MoveTool;
    })();

    var PanZoomTool = (function () {
        function PanZoomTool() {
        }
        PanZoomTool.prototype.onPointer = function (e) {
            switch (e.state) {
                case InteractionHelper.State.Start:
                    break;

                case InteractionHelper.State.Move:
                    g_panZoom.pan.x += g_panZoom.deltaX;
                    g_panZoom.pan.y += g_panZoom.deltaY;
                    this.drawPanZoom();
                    break;

                case InteractionHelper.State.MouseWheel:
                    var scale = (g_panZoom.deltaY > 0 ? 0.5 : 2);
                    g_panZoom.pan.x += e.x * g_panZoom.zoom * (1 - scale);
                    g_panZoom.pan.y += e.y * g_panZoom.zoom * (1 - scale);
                    g_panZoom.zoom *= scale;

                    this.drawPanZoom();
                    break;

                case InteractionHelper.State.End:
                    break;
            }
        };

        PanZoomTool.prototype.drawPanZoom = function () {
            g_shapeList.requestDraw();
        };
        return PanZoomTool;
    })();

    //------------------------------
    function toolButtonClick(e) {
        setTool(e.target.id);
    }

    function save() {
        var obj = {
            shapeList: g_shapeList.save(),
            panZoom: g_panZoom.save()
        };
        localStorage['layouteditor'] = JSON.stringify(obj);
    }

    function load() {
        var obj = JSON.parse(localStorage['layouteditor']);
        reset();
        g_shapeList.load(obj.shapeList);
        g_panZoom.load(obj.panZoom);
    }

    function reset() {
        g_commandList.reset();
        g_shapeList.reset();
        g_shapeList.requestDraw();
        g_panZoom.reset();
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
        document.getElementById("clear").addEventListener("click", reset);
        document.getElementById("save").addEventListener("click", save);
        document.getElementById("load").addEventListener("click", load);

        setTool("rectTool");

        var watchCanvas = new InteractionHelper.Watch(g_toolCanvas, function (e) {
            g_panZoom.x = e.x;
            g_panZoom.y = e.y;
            g_panZoom.deltaX = e.deltaX;
            g_panZoom.deltaY = e.deltaY;
            g_panZoom.pinchDistance = e.pinchDistance;

            e.x = g_panZoom.toX(e.x);
            e.y = g_panZoom.toY(e.y);
            e.deltaX = g_panZoom.toW(e.deltaX);
            e.deltaY = g_panZoom.toH(e.deltaY);
            e.pinchDistance *= g_panZoom.zoom;

            g_tool.onPointer(e);
        });
    });
})(LayoutEditor || (LayoutEditor = {}));
