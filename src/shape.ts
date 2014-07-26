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

        reset() {
            this.rotate = 0;
            this.cx = undefined;
            this.cy = undefined;
            this.hw = undefined;
            this.hh = undefined;
        }

        getArea() {
            return this.hw * this.hh * 4;
        }

        enclose(aabb: Bounds) {
            Helper.assert(aabb.rotate === 0); // only works with unrotated bounds 0
            Helper.assert(this.rotate === 0);

            if (this.cx === undefined) {
                this.cx = aabb.cx;
                this.cy = aabb.cy;
                this.hw = aabb.hw;
                this.hh = aabb.hh;
            } else {
                var x1: number = Math.min(this.cx - this.hw, aabb.cx - aabb.hw);
                var y1: number = Math.min(this.cy - this.hh, aabb.cy - aabb.hh);
                var x2: number = Math.max(this.cx + this.hw, aabb.cx + aabb.hw);
                var y2: number = Math.max(this.cy + this.hh, aabb.cy + aabb.hh);
                this.cx = (x1 + x2) * 0.5;
                this.cy = (y1 + y2) * 0.5;
                this.hw = (x2 - x1) * 0.5;
                this.hh = (y2 - y1) * 0.5;
            }
        }

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
    export class SimpleTransform {
        constructor(public scaleX: number, public scaleY: number, public shear: number,
            public rotate: number, public tx: number, public ty: number) {}
    }

    export class Transform {
        // | a| b|
        // | c| d|
        // |tx|ty|
        a: number = 1;
        b: number = 0;
        c: number = 0;
        d: number = 1;
        tx: number = 0;
        ty: number = 0;

        constructor() {}

        setIdentity() {
            this.constructor();
        }

        setRotate(rad) {
            var sr: number = Math.sin(rad);
            var cr: number = Math.cos(rad);
            this.a = cr;
            this.b = -sr;
            this.c = sr;
            this.d = cr;
            // this.tx = 0;
            // this.ty = 0;
        }

        rotate(rad) {
            var sr: number = Math.sin(rad);
            var cr: number = Math.cos(rad);
            var a: number = this.a;
            var b: number = this.b;
            var c: number = this.c;
            var d: number = this.d;
            this.a = a * cr - b * sr;
            this.b = a * sr + b * cr;
            this.c = c * cr - d * sr;
            this.d = c * sr + d * cr;
        }

        scale(sx: number, sy: number) {
            this.a *= sx;
            this.b *= sy;
            this.c *= sx;
            this.d *= sy;
        }

        translate(tx: number, ty: number) {
            this.tx += tx;
            this.ty += ty;
        }

        decompose(): SimpleTransform {
            var a: number = this.a;
            var b: number = this.b;
            var c: number = this.c;
            var d: number = this.d;

            var scaleX: number = Math.sqrt(a * a + b * b);
            a /= scaleX;
            b /= scaleX;

            var shear: number = a * c + b * d;
            c -= a * shear;
            d -= b * shear;

            var scaleY: number = Math.sqrt(c * c + d * d);
            c /= scaleY;
            d /= scaleY;
            shear /= scaleY;

            if (a * d < b * c) {
                a = -a;
                b = -b;
                shear = -shear;
                scaleX = -scaleX;
            }

            return new SimpleTransform(scaleX, scaleY, shear, Math.atan2(b, a), this.tx, this.ty);
        }

        calcXY(lx: number, ly: number): XY {
            return {
                x: lx * this.a + ly * this.c + this.tx,
                y: lx * this.b + ly * this.d + this.ty
            };
        }

        copy(): Transform {
            var t: Transform = new Transform();
            t.a = this.a;
            t.b = this.b;
            t.c = this.c;
            t.d = this.d;
            t.tx = this.tx;
            t.ty = this.ty
            return t;
        }

        invXY(x: number, y: number): XY {
            var det: number = this.a * this.d - this.b * this.c;
            Helper.assert(Math.abs(det) > EPSILON);

            var a = this.d;
            var b = -this.c;
            var c = -this.b;
            var d = this.a;
            var tx = (this.b * this.ty - this.d * this.tx);
            var ty = (this.c * this.tx - this.a * this.ty);

            return {
                x: (x * a + y * c + tx) / det,
                y: (x * b + y * d + ty) / det
            };
        }

        isEqual(other: Transform): boolean {
            return this.tx === other.tx && this.ty === other.ty &&
                this.a === other.a && this.b === other.b &&
                this.c === other.c && this.d === other.d;
        }
    }

    //------------------------------
    export class Shape {
        private style: Style = g_style;
        isDeleted: boolean = false;
        oabb: Bounds = new Bounds();
        aabb: Bounds = new Bounds();
        transform: Transform = new Transform();
        name: string = "";
        text: string = "";

        static uniqueID: number = 0;

        constructor(name ? : string) {
            if (typeof name === "undefined")
                this.makeUnique();
            else
                this.name = name;
        }

        makeUnique() {
            this.name = "Shape" + Shape.uniqueID++;
        }

        setStyle(style: Style) {
            this.style = style;
        }

        getStyle(): Style {
            return this.style;
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
            var u = x * g_panZoom.zoom + g_panZoom.panX;
            var v = y * g_panZoom.zoom + g_panZoom.panY;

            this.buildPath(ctx);
            return ctx.isPointInPath(u, v);
        }

        isInsideOABBXY(x: number, y: number): boolean {
            var oabb: Bounds = this.oabb;
            var localPos: XY = oabb.invXY(x, y);
            return localPos.x >= -oabb.hw && localPos.x < oabb.hw &&
                localPos.y >= -oabb.hh && localPos.y < oabb.hh;
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
            g_panZoom.transformComplete(ctx, transform);

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
            this.transform.tx = x + w * 0.5;
            this.transform.ty = y + h * 0.5;
            this.w = w;
            this.h = h;
            this.calculateBounds();
        }

        calculateBounds() {
            var transform = this.transform;
            var dx = this.w * 0.5;
            var dy = this.h * 0.5;

            var info: SimpleTransform = transform.decompose();
            this.oabb.rotate = info.rotate;
            this.oabb.hw = Math.abs(dx * info.scaleX);
            this.oabb.hh = Math.abs(dy * info.scaleY);
            this.oabb.cx = transform.tx;
            this.oabb.cy = transform.ty;

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
            g_panZoom.transformComplete(ctx, transform);

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
            this.transform.tx = x + w * 0.5;
            this.transform.ty = y + h * 0.5;
            this.rx = w * 0.5;
            this.ry = h * 0.5;
            this.calculateBounds();
        }

        calculateBounds() {
            var transform = this.transform;

            var info: SimpleTransform = transform.decompose();
            var hw = Math.abs(this.rx * info.scaleX);
            var hh = Math.abs(this.ry * info.scaleY);

            this.oabb.rotate = info.rotate;
            this.oabb.hw = hw;
            this.oabb.hh = hh;
            this.oabb.cx = transform.tx;
            this.oabb.cy = transform.ty;

            this.aabb.rotate = 0;

            var rot = info.rotate
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

        reset() {
            this.x1 = undefined;
            this.y1 = undefined;
            this.x2 = undefined;
            this.y2 = undefined;
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

    export class GroupShape extends Shape {
        shapes: Shape[] = [];
        private oldTransforms: Transform[] = []; // original transform for each shape
        private lastTransform: Transform = new Transform();
        private encloseHH: number = 0;
        private encloseHW: number = 0;
        private encloseCX: number = 0;
        private encloseCY: number = 0;

        constructor(name ? : string) {
            super(name);
        }

        reset() {
            this.shapes.length = 0;
            this.encloseHW = 0;
            this.encloseHH = 0;
            this.encloseCX = 0;
            this.encloseCY = 0;
        }

        setShapes(shapes: Shape[]) {
            this.shapes = shapes.slice(); // copy

            this.encloseShapes();
        }

        setStyle(style: Style) {
            super.setStyle(style);

            for (var i: number = 0; i < this.shapes.length; ++i) {
                this.shapes[i].setStyle(style);
            }
        }


        copy(base ? : GroupShape): GroupShape {
            if (!base)
                base = new GroupShape();
            super.copy(base);
            Helper.extend(base.lastTransform, this.lastTransform);

            for (var i: number = 0; i < this.shapes.length; ++i) {
                base.oldTransforms[i] = new Transform();
                Helper.extend(base.oldTransforms[i], this.oldTransforms[i]);
                base.shapes[i] = this.shapes[i].copy();
            }
            return base;
        }

        // shapes in this group will be drawn independently
        draw(ctx) {}

        // use a standard draw for the subelements, when selected
        drawSelect(ctx) {
            if (this.shapes.length === 0)
                return; // nothing to draw

            for (var i: number = 0; i < this.shapes.length; ++i) {
                this.shapes[i].draw(ctx);
            }

            // draw the bounds
            g_selectStyle.draw(ctx);
            super.drawSelect(ctx);
        }

        // check each sub-shape individually
        isInsideXY(ctx, x: number, y: number): boolean {
            for (var i: number = 0; i < this.shapes.length; ++i) {
                if (this.shapes[i].isInsideXY(ctx, x, y))
                    return true;
            }

            return false;
        }

        private applyTransform() {
            if (this.transform.isEqual(this.lastTransform))
                return;

            var transform: Transform = this.transform;
            var info: SimpleTransform = transform.decompose();

            for (var i: number = 0; i < this.shapes.length; ++i) {
                var shape: Shape = this.shapes[i];
                var oldTransform: Transform = this.oldTransforms[i];

                var newPos: XY = transform.calcXY(oldTransform.tx - this.encloseCX, oldTransform.ty - this.encloseCY);

                Helper.extend(shape.transform, oldTransform);
                shape.transform.tx = newPos.x;
                shape.transform.ty = newPos.y;

                // TODO - this is wrong
                shape.transform.scale(info.scaleX, info.scaleY);
                shape.transform.rotate(info.rotate);

                shape.calculateBounds();
            }

            Helper.extend(this.lastTransform, this.transform);
        }

        encloseShapes() {
            var aabb: Bounds = this.aabb;
            var oabb: Bounds = this.oabb;

            var numShapes: number = this.shapes.length;
            aabb.reset();

            this.oldTransforms.length = 0;
            for (var i: number = 0; i < numShapes; ++i) {
                var shape: Shape = this.shapes[i];

                this.oldTransforms[i] = new Transform();
                Helper.extend(this.oldTransforms[i], this.shapes[i].transform);

                aabb.enclose(shape.aabb);
            }

            if (numShapes === 1) {
                Helper.extend(oabb, this.shapes[0].oabb); // if only one shape then mimic it
            } else {
                Helper.extend(oabb, aabb); // initial oabb matches aabb
            }

            var transform: Transform = this.transform;
            transform.setIdentity();
            transform.tx = aabb.cx;
            transform.ty = aabb.cy;

            Helper.extend(this.lastTransform, transform);

            this.encloseHW = aabb.hw;
            this.encloseHH = aabb.hh;
            this.encloseCX = aabb.cx;
            this.encloseCY = aabb.cy;
        }

        calculateBounds() {
            // move all the sub-objects
            this.applyTransform();

            var transform: Transform = this.transform;
            var oabb: Bounds = this.oabb;
            var aabb: Bounds = this.aabb;
            var info: SimpleTransform = transform.decompose();

            oabb.rotate = info.rotate;
            oabb.hw = Math.abs(this.encloseHW * info.scaleX);
            oabb.hh = Math.abs(this.encloseHH * info.scaleY);
            oabb.cx = transform.tx;
            oabb.cy = transform.ty;

            var polygon: number[] = oabb.toPolygon();
            var x1: number = Helper.arrayMin(polygon, 0, 2);
            var x2: number = Helper.arrayMax(polygon, 0, 2);
            var y1: number = Helper.arrayMin(polygon, 1, 2);
            var y2: number = Helper.arrayMax(polygon, 1, 2);

            aabb.rotate = 0;
            aabb.hw = (x2 - x1) * 0.5;
            aabb.hh = (y2 - y1) * 0.5;
            aabb.cx = (x1 + x2) * 0.5;
            aabb.cy = (y1 + y2) * 0.5;
        }

        saveData(): any {
            var obj: any = super.saveData();
            obj.type = "GroupShape";
            return obj;
        }

        loadData(obj: any) {
            Helper.assert(obj.type === "GroupShape");
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

            // forward, so the list order is the same as the draw order
            for (var i: number = 0; i < this.shapes.length; ++i) {
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
        selectGroup: GroupShape = new GroupShape("Select");

        constructor() {}

        reset() {
            this.selectedShapes.length = 0;
        }

        // removes the shape from the selected list
        removeSelected(shape: Shape) {
            var index: number = this.selectedShapes.indexOf(shape);
            if (index !== -1) {
                this.selectedShapes.splice(index, 1);
                this.rebuildSelectGroup();
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
            this.rebuildSelectGroup();
        }

        isSelected(shape: Shape): boolean {
            return this.selectedShapes.indexOf(shape) !== -1;
        }

        setSelectedShapes(shapes: Shape[]) {
            this.selectedShapes = shapes.slice(); // copy
            this.rebuildSelectGroup();
        }

        // returns the instance
        getSelectedShapes(): Shape[] {
            return this.selectedShapes;
        }

        clearSelectedShapes() {
            this.selectedShapes.length = 0;
            this.rebuildSelectGroup();
        }

        // deletes all of the selected shapes
        deleteSelected() {
            for (var i: number = 0; i < this.selectedShapes.length; ++i) {
                g_shapeList.removeShape(this.selectedShapes[i]);
            }
            this.selectedShapes.length = 0;

            this.rebuildSelectGroup();
        }

        // duplicates all of the selected shapes
        duplicateSelected(): Shape[] {
            var copyShapes: Shape[] = [];
            for (var i: number = 0; i < this.selectedShapes.length; ++i) {
                var copyShape: Shape = g_shapeList.duplicateShape(this.selectedShapes[i]);
                copyShape.transform.tx += 20;
                copyShape.calculateBounds();
                copyShapes.push(copyShape);
            }

            this.rebuildSelectGroup();
            return copyShapes;
        }

        draw(ctx) {
            this.selectGroup.drawSelect(ctx);

            // for (var i: number = 0; i < numSelectedShapes; ++i) {
            //     var shape: Shape = this.selectedShapes[i];
            //     Helper.assert(!shape.isDeleted);
            //     shape.drawSelect(ctx);
            // }
        }

        rebuildSelectGroup() {
            this.selectGroup.reset();
            this.selectGroup.setShapes(this.selectedShapes);

            g_draw(this);
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
