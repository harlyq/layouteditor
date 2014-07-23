/// <reference path="_dependencies.ts" />
module LayoutEditor {

    //------------------------------
    export class Bounds {
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

        invXY(x: number, y: number): XY {
            var newPos: XY = {
                x: 0,
                y: 0
            };

            var sr: number = Math.sin(this.rotate);
            var cr: number = Math.cos(this.rotate);

            newPos.x = x - this.cx;
            newPos.y = y - this.cy;

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

            return {
                x: lx,
                y: ly
            };
        }
    }

    export

    function drawPolygon(ctx, polygon: number[]) {
        if (polygon.length < 4)
            return;

        ctx.strokeStyle = "green";
        ctx.moveTo(polygon[0], polygon[1]);
        for (var i = 2; i < polygon.length; i += 2) {
            ctx.lineTo(polygon[i], polygon[i + 1]);
        };
        ctx.lineTo(polygon[0], polygon[1]);
        ctx.stroke();
    }


    //------------------------------
    export class Transform {
        rotate: number = 0;
        scale: XY = {
            x: 1,
            y: 1
        };
        translate: XY = {
            x: 0,
            y: 0
        };

        calcXY(x: number, y: number): XY {
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

        invXY(x: number, y: number): XY {
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
    export class Shape {
        style: Style = g_style;
        isDeleted: boolean = false;
        oabb: Bounds = new Bounds();
        aabb: Bounds = new Bounds();
        transform: Transform = new Transform();
        name: string = "";
        text: string = "";

        static uniqueID: number = 0;

        constructor() {
            this.makeUnique();
        }

        makeUnique() {
            this.name = "Shape" + Shape.uniqueID++;
        }

        setStyle(style: Style) {
            this.style = style;
        }

        draw(ctx) {
            this.style.draw(ctx);

            this.buildPath(ctx);

            if (this.style.fillStyle !== "none")
                ctx.fill();
            if (this.style.strokeStyle !== "none")
                ctx.stroke();

            this.drawText(ctx);
        }

        // implemented in the derived class
        public buildPath(ctx) {}

        drawSelect(ctx) {
            var oabb = this.oabb;
            ctx.save();
            g_panZoom.transform(ctx, oabb.cx, oabb.cy, oabb.rotate);
            ctx.beginPath();
            ctx.rect(-oabb.hw, -oabb.hh, oabb.hw * 2, oabb.hh * 2);
            ctx.restore();
            ctx.stroke();
        }

        drawAABB(ctx) {
            var aabb = this.aabb;
            ctx.save();
            g_panZoom.transform(ctx);
            ctx.beginPath();
            ctx.rect(aabb.cx - aabb.hw, aabb.cy - aabb.hh, aabb.hw * 2, aabb.hh * 2);
            ctx.restore();
            ctx.stroke();
        }

        drawText(ctx) {
            if (this.text.length === 0)
                return;

            var oabb = this.oabb;

            ctx.save();
            g_panZoom.transform(ctx, oabb.cx, oabb.cy, oabb.rotate);

            var textLines: string[] = this.text.split("\n");
            var lineHeight: number = this.style.fontSize * this.style.fontSpacing;
            var textWidth: number = 0;
            var textHeight: number = textLines.length * lineHeight;

            for (var i: number = 0; i < textLines.length; ++i) {
                var lineWidth = ctx.measureText(textLines[i]).width;
                if (lineWidth > textWidth)
                    textWidth = lineWidth;
            }

            var hh: number = oabb.hh; // already scaled
            var hw: number = oabb.hw; // already scaled
            var x: number = 0;
            var y: number = 0;
            switch (this.style.textBaseline) {
                case "top":
                    y = -hh;
                    break
                case "middle":
                    y = (lineHeight - textHeight) * 0.5;
                    break;
                case "bottom":
                    y = hh - textHeight + lineHeight;
                    break
            }

            switch (this.style.textAlign) {
                case "left":
                    x = -hw;
                    break
                case "right":
                    x = hw;
                    break
            }

            if (ctx.fillStlye !== this.style.fontStyle)
                ctx.fillStyle = this.style.fontStyle;

            for (var i: number = 0; i < textLines.length; ++i) {
                ctx.fillText(textLines[i], x, y);
                y += lineHeight;
            }

            ctx.restore();
        }

        // performed by the derived class
        calculateBounds() {}

        isInsideXY(ctx, x: number, y: number): boolean {
            var u = x * g_panZoom.zoom + g_panZoom.pan.x;
            var v = y * g_panZoom.zoom + g_panZoom.pan.y;

            this.buildPath(ctx);
            return ctx.isPointInPath(u, v);
        }

        isOverlapBounds(bounds: Bounds): boolean {
            var polygonA: number[] = this.aabb.toPolygon();
            var polygonB: number[] = bounds.toPolygon();

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
            Helper.extend(base, this);
            return base;
        }

        // overloaded by specific shape
        saveData(): any {
            return {
                name: this.name,
                text: this.text,
                style: this.style.name,
                transform: this.transform
            };
        }

        // overloaded by specific shape
        loadData(obj: any) {
            this.name = obj.name;
            this.text = obj.text;
            this.style = g_styleList.getStyle(obj.style);
            Helper.extend(this.transform, obj.transform);
        }
    }

    export class RectShape extends Shape {
        constructor(public w: number, public h: number) {
            super();
        }

        buildPath(ctx) {
            var transform = this.transform;

            ctx.save();
            g_panZoom.transform(ctx, transform.translate.x, transform.translate.y,
                transform.rotate, transform.scale.x, transform.scale.y);

            ctx.beginPath();
            ctx.rect(-this.w * 0.5, -this.h * 0.5, this.w, this.h);
            ctx.restore();
        }

        copy(base ? : RectShape): RectShape {
            if (!base)
                base = new RectShape(this.w, this.h);
            super.copy(base);
            Helper.extend(base, this);
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
            var x1: number = Helper.arrayMin(polygon, 0, 2);
            var x2: number = Helper.arrayMax(polygon, 0, 2);
            var y1: number = Helper.arrayMin(polygon, 1, 2);
            var y2: number = Helper.arrayMax(polygon, 1, 2);

            this.aabb.rotate = 0;
            this.aabb.hw = (x2 - x1) * 0.5;
            this.aabb.hh = (y2 - y1) * 0.5;
            this.aabb.cx = (x1 + x2) * 0.5;
            this.aabb.cy = (y1 + y2) * 0.5;
        }

        saveData(): any {
            var obj: any = super.saveData();
            obj.type = "RectShape";
            obj.w = this.w;
            obj.h = this.h;
            obj.text = this.text;
            return obj;
        }

        loadData(obj: any) {
            Helper.assert(obj.type === "RectShape");
            this.w = obj.w;
            this.h = obj.h;
            this.text = obj.text;
            super.loadData(obj);
        }
    }

    export class EllipseShape extends Shape {
        constructor(public rx: number, public ry: number) {
            super();
        }

        buildPath(ctx) {
            var transform = this.transform;
            var rx = Math.abs(this.rx);
            var ry = Math.abs(this.ry);

            ctx.save();
            g_panZoom.transform(ctx, transform.translate.x, transform.translate.y,
                transform.rotate, transform.scale.x, transform.scale.y);

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
            Helper.extend(base, this);
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

        saveData(): any {
            var obj: any = super.saveData();
            obj.type = "EllipseShape";
            obj.rx = this.rx;
            obj.ry = this.ry;
            return obj;
        }

        loadData(obj: any) {
            Helper.assert(obj.type === "EllipseShape");
            this.rx = obj.rx;
            this.ry = obj.ry;
            super.loadData(obj);
        }
    }

    // cannot transform!!!
    export class AABBShape extends Shape {
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
            Helper.extend(base, this);
            return base;
        }

        buildPath(ctx) {
            // don't apply transform!
            var x1 = this.oabb.cx - this.oabb.hw;
            var y1 = this.oabb.cy - this.oabb.hh;
            ctx.save();
            g_panZoom.transform(ctx);
            ctx.beginPath();
            ctx.rect(x1, y1, this.oabb.hw * 2, this.oabb.hh * 2);
            ctx.restore();
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

        saveData(): any {
            var obj: any = super.saveData();
            obj.type = "AABBShape";
            obj.x1 = this.x1;
            obj.y1 = this.y1;
            obj.x2 = this.x2;
            obj.y2 = this.y2;
            return obj;
        }

        loadData(obj: any) {
            Helper.assert(obj.type === "AABBShape");
            this.x1 = obj.x1;
            this.y1 = obj.y1;
            this.x2 = obj.x2;
            this.y2 = obj.y2;
            super.loadData(obj);
        }
    }

    //------------------------------
    export class ShapeList {
        shapes: Shape[] = [];
        deletedShapes: Shape[] = [];
        private hitCtx;

        constructor() {
            this.hitCtx = document.createElement("canvas").getContext("2d");
        }

        reset() {
            this.shapes.length = 0;
            this.deletedShapes.length = 0;
        }

        addShapes(shapes: Shape[]) {
            for (var i: number = 0; i < shapes.length; ++i)
                this.addShape(shapes[i]);
        }

        removeShapes(shapes: Shape[]) {
            for (var i: number = 0; i < shapes.length; ++i)
                this.removeShape(shapes[i]);
        }

        addShape(shape: Shape) {
            shape.isDeleted = false;

            // add the shape if not already present
            var shapeIndex: number = this.shapes.indexOf(shape);
            if (shapeIndex === -1)
                this.shapes.push(shape);

            // undelete the shape if necessary
            var deletedIndex: number = this.deletedShapes.indexOf(shape);
            if (deletedIndex !== -1)
                this.deletedShapes.splice(deletedIndex, 1);

            g_draw(this);
        }

        removeShape(shape: Shape) {
            shape.isDeleted = true;

            var shapeIndex: number = this.shapes.indexOf(shape);
            if (shapeIndex !== -1)
                this.shapes.splice(shapeIndex, 1);

            var deletedIndex: number = this.deletedShapes.indexOf(shape);
            if (deletedIndex === -1)
                this.deletedShapes.push(shape);

            g_selectList.removeSelected(shape); // TODO should we remove this dependency?
            g_draw(this);
        }

        duplicateShape(shape: Shape): Shape {
            var newShape: Shape = shape.copy();
            newShape.makeUnique();

            this.addShape(newShape);
            return newShape;
        }

        draw(ctx) {
            // normal shapes
            var numShapes: number = this.shapes.length;
            for (var i: number = 0; i < numShapes; ++i) {
                var shape: Shape = this.shapes[i];
                shape.draw(ctx);
            }
        }

        getShapeInXY(x: number, y: number): Shape {
            // in reverse as the last shapes are drawn on top
            for (var i: number = this.shapes.length - 1; i >= 0; --i) {
                var shape: Shape = this.shapes[i];
                if (shape.isInsideXY(this.hitCtx, x, y))
                    return shape;
            }

            return null;
        }

        getShapesInBounds(bounds: Bounds): Shape[] {
            var shapes: Shape[] = [];

            for (var i: number = this.shapes.length - 1; i >= 0; --i) {
                var shape: Shape = this.shapes[i];
                if (shape.isOverlapBounds(bounds)) {
                    shape.isOverlapBounds(bounds);
                    shapes.push(shape);
                }
            }

            return shapes;
        }

        create(type: string): Shape {
            switch (type) {
                case "RectShape":
                    return new RectShape(0, 0);
                case "EllipseShape":
                    return new EllipseShape(0, 0);
                case "AABBShape":
                    return new AABBShape();
            }
        }

        saveData(): any {
            var obj = {
                shapes: []
            };
            for (var i: number = 0; i < this.shapes.length; ++i) {
                var shape: Shape = this.shapes[i];
                obj.shapes.push(shape.saveData());
            }
            return obj;
        }

        loadData(obj: any) {
            this.reset();
            for (var i: number = 0; i < obj.shapes.length; ++i) {
                var shapeSave = obj.shapes[i];
                var newShape: Shape = this.create(shapeSave.type);
                newShape.loadData(shapeSave);
                newShape.calculateBounds();
                g_shapeList.addShape(newShape);
            }
        }
    }

    //------------------------------
    export class SelectList {
        selectedShapes: Shape[] = [];
        selectedStyle: Style = new Style();

        constructor() {
            this.selectedStyle.strokeStyle = "blue";
            this.selectedStyle.fillStyle = "none";
            this.selectedStyle.lineWidth = 2;
            this.selectedStyle.lineDash = [5, 5];
        }

        reset() {
            this.selectedShapes.length = 0;
        }

        // removes the shape from the selected list
        removeSelected(shape: Shape) {
            var index: number = this.selectedShapes.indexOf(shape);
            if (index !== -1) {
                this.selectedShapes.splice(index, 1);
                g_draw(this);
            }
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
            g_draw(this);
        }

        setSelectedShapes(shapes: Shape[]) {
            this.selectedShapes = shapes.slice(); // copy
            g_draw(this);
        }

        // returns a copy
        getSelectedShapes(): Shape[] {
            return this.selectedShapes.slice();
        }

        clearSelectedShapes() {
            this.selectedShapes.length = 0;
            g_draw(this);
        }

        // deletes all of the selected shapes
        deleteSelected() {
            for (var i: number = 0; i < this.selectedShapes.length; ++i) {
                g_shapeList.removeShape(this.selectedShapes[i]);
            }
            this.selectedShapes.length = 0;

            g_draw(this);
        }

        // duplicates all of the selected shapes
        duplicateSelected(): Shape[] {
            var copyShapes: Shape[] = [];
            for (var i: number = 0; i < this.selectedShapes.length; ++i) {
                var copyShape: Shape = g_shapeList.duplicateShape(this.selectedShapes[i]);
                copyShape.transform.translate.x += 20;
                copyShape.calculateBounds();
                copyShapes.push(copyShape);
            }

            g_draw(this);
            return copyShapes;
        }

        draw(ctx) {
            this.selectedStyle.draw(ctx);

            var numSelectedShapes: number = this.selectedShapes.length;
            for (var i: number = 0; i < numSelectedShapes; ++i) {
                var shape: Shape = this.selectedShapes[i];
                Helper.assert(!shape.isDeleted);
                shape.drawSelect(ctx);
            }
        }
    }

    export
    var g_selectList: SelectList = new SelectList();
    export
    var g_shapeList: ShapeList = new ShapeList();

    g_propertyPanel.addPropertyList({
        isA: (obj: any) => {
            return obj instanceof Shape;
        },
        items: [{
            name: "name"
        }, {
            name: "style",
            type: "object",
            getReferenceList: () => {
                return g_styleList.getReferenceList();
            }
        }]
    });


}
