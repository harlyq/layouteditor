// Copyright 2014 Reece Elliott

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

        isValid() {
            return this.cx !== undefined;
        }

        getArea() {
            return this.hw * this.hh * 4;
        }

        copy(other: Bounds) {
            this.rotate = other.rotate;
            this.cx = other.cx;
            this.cy = other.cy;
            this.hw = other.hw;
            this.hh = other.hh;
        }

        clone() {
            var newBounds: Bounds = new Bounds();
            newBounds.copy(this);
            return newBounds;
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
            for (var i = 0; i < polygon.length; i += 2) {
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

        copy(other: Transform) {
            this.a = other.a;
            this.b = other.b;
            this.c = other.c;
            this.d = other.d;
            this.tx = other.tx;
            this.ty = other.ty;
        }

        clone(): Transform {
            var t: Transform = new Transform();
            t.copy(this);
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
        style: Style = g_style;
        oabb: Bounds = new Bounds();
        aabb: Bounds = new Bounds();
        transform: Transform = new Transform();
        name: string = "";
        text: string = "";
        layer: Layer = null;
        onChanged = new Helper.Callback < () => void > ()

        static uniqueID: number = 1;

        constructor(name ? : string) {
            if (typeof name === "undefined" || name.length === 0)
                this.makeUnique();
            else
                this.name = name;
        }

        makeUnique() {
            this.name = "Shape" + Shape.uniqueID++;
        }

        refresh() {
            this.calculateBounds();
        }

        draw(ctx, panZoom) {
            this.style.drawShape(ctx);

            this.buildPath(ctx, panZoom);

            if (this.style.fillColor !== "none")
                ctx.fill();
            if (this.style.strokeColor !== "none")
                ctx.stroke();

            this.drawText(ctx, panZoom);
        }

        // implemented in the derived class
        public buildPath(ctx, panZoom: PanZoom) {}

        drawSelect(ctx, panZoom: PanZoom) {
            var oabb = this.oabb;

            ctx.save();
            panZoom.transform(ctx, oabb.cx, oabb.cy, oabb.rotate);
            ctx.beginPath();
            ctx.rect(-oabb.hw, -oabb.hh, oabb.hw * 2, oabb.hh * 2);
            ctx.restore();
            ctx.stroke();
        }

        drawAABB(ctx, panZoom: PanZoom) {
            var aabb = this.aabb;

            ctx.save();
            panZoom.transform(ctx);
            ctx.beginPath();
            ctx.rect(aabb.cx - aabb.hw, aabb.cy - aabb.hh, aabb.hw * 2, aabb.hh * 2);
            ctx.restore();
            ctx.stroke();
        }

        drawText(ctx, panZoom: PanZoom) {
            if (this.text.length === 0)
                return;

            var oabb = this.oabb;

            ctx.save();
            panZoom.transform(ctx, oabb.cx, oabb.cy, oabb.rotate);

            this.style.drawFont(ctx);

            var textLines: string[] = this.text.split("\n");
            var lineHeight: number = this.style.fontSize * this.style.fontSpacing;
            var textWidth: number = 0;
            var textHeight: number = textLines.length * lineHeight;

            for (var i = 0; i < textLines.length; ++i) {
                var lineWidth = ctx.measureText(textLines[i]).width;
                if (lineWidth > textWidth)
                    textWidth = lineWidth;
            }

            var hh: number = oabb.hh; // already scaled
            var hw: number = oabb.hw; // already scaled
            var x: number = 0;
            var y: number = 0;
            switch (this.style.textBaseline) {
                case StyleTextBaseline.top:
                    y = -hh;
                    break
                case StyleTextBaseline.middle:
                    y = (lineHeight - textHeight) * 0.5;
                    break;
                case StyleTextBaseline.bottom:
                    y = hh - textHeight + lineHeight;
                    break
            }

            switch (this.style.textAlign) {
                case StyleTextAlign.left:
                    x = -hw;
                    break
                case StyleTextAlign.right:
                    x = hw;
                    break
            }

            for (var i = 0; i < textLines.length; ++i) {
                ctx.fillText(textLines[i], x, y);
                y += lineHeight;
            }

            ctx.restore();
        }

        // performed by the derived class
        calculateBounds() {}

        isInsideXY(ctx, x: number, y: number): boolean {
            this.buildPath(ctx, PanZoom.none);
            return ctx.isPointInPath(x, y);
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

            for (var i = 0; i < 2; ++i) {
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

        copy(other: Shape) {
            this.style = other.style;
            this.oabb.copy(other.oabb);
            this.aabb.copy(other.aabb);
            this.transform.copy(other.transform);
            this.name = other.name;
            this.text = other.text;
            this.layer = other.layer;
        }

        clone(): Shape {
            var shape = new Shape();
            shape.copy(this);
            return shape;
        }

        // overloaded by specific shape
        saveData(): any {
            return {
                name: this.name,
                text: this.text,
                style: this.style.id,
                transform: this.transform
                //layer: this.layer -- layers must be set up manually
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
        constructor(name: string, public w: number, public h: number) {
            super(name);
        }

        buildPath(ctx, panZoom: PanZoom) {
            var transform = this.transform;

            ctx.save();
            panZoom.transformComplete(ctx, transform);

            ctx.beginPath();
            ctx.rect(-this.w * 0.5, -this.h * 0.5, this.w, this.h);
            ctx.restore();
        }

        copy(other: RectShape) {
            super.copy(other);
            this.w = other.w;
            this.h = other.h;
        }

        clone(): RectShape {
            var shape = new RectShape(this.name, this.w, this.h);
            shape.copy(this);
            return shape;
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
        constructor(name: string, public rx: number, public ry: number) {
            super(name);
        }

        buildPath(ctx, panZoom: PanZoom) {
            var transform = this.transform;
            var rx = Math.abs(this.rx);
            var ry = Math.abs(this.ry);

            ctx.save();
            panZoom.transformComplete(ctx, transform);

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

        copy(other: EllipseShape) {
            super.copy(other);
            this.rx = other.rx;
            this.ry = other.ry;
        }

        clone(): EllipseShape {
            var shape = new EllipseShape(this.name, this.rx, this.ry);
            shape.copy(this);
            return shape;
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

        copy(other: AABBShape) {
            super.copy(other);
            this.x1 = other.x1;
            this.y1 = other.y1;
            this.x2 = other.x2;
            this.y2 = other.y2;
        }

        clone(): AABBShape {
            var shape = new AABBShape();
            shape.copy(this);
            return shape;
        }

        reset() {
            this.x1 = undefined;
            this.y1 = undefined;
            this.x2 = undefined;
            this.y2 = undefined;
        }

        buildPath(ctx, panZoom: PanZoom) {
            // don't apply transform!
            var x1 = this.oabb.cx - this.oabb.hw;
            var y1 = this.oabb.cy - this.oabb.hh;
            ctx.save();
            panZoom.transform(ctx);
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
        shapes: Shape[] = []; // shapes in the group
        enclosedShapes: Shape[] = []; // non-deleted shapes in the group
        oldTransforms: Transform[] = []; // original transform for each shape
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
            this.enclosedShapes.length = 0;
            this.encloseHW = 0;
            this.encloseHH = 0;
            this.encloseCX = 0;
            this.encloseCY = 0;
        }

        setShapes(shapes: Shape[]) {
            this.shapes = shapes.slice(); // copy

            this.encloseShapes();
        }

        copy(other: GroupShape) {
            super.copy(other);
            this.lastTransform.copy(other.lastTransform);

            for (var i = 0; i < this.shapes.length; ++i) {
                this.oldTransforms[i] = new Transform();
                this.oldTransforms[i].copy(other.oldTransforms[i]);
                this.shapes[i] = other.shapes[i].clone();
            }
        }

        clone(): GroupShape {
            var shape = new GroupShape();
            shape.copy(this);
            return shape;
        }

        // shapes in this group will be drawn independently
        draw(ctx, panZoom: PanZoom) {}

        // use a standard draw for the subelements, when selected
        drawSelect(ctx, panZoom: PanZoom) {
            if (this.enclosedShapes.length === 0)
                return; // nothing to draw

            // draw the bounds
            g_selectStyle.drawShape(ctx);
            super.drawSelect(ctx, panZoom);
        }

        // check each sub-shape individually
        isInsideXY(ctx, x: number, y: number): boolean {
            for (var i = 0; i < this.shapes.length; ++i) {
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

            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                var oldTransform: Transform = this.oldTransforms[i];

                var newPos: XY = transform.calcXY(oldTransform.tx - this.encloseCX, oldTransform.ty - this.encloseCY);

                shape.transform.copy(oldTransform);
                shape.transform.tx = newPos.x;
                shape.transform.ty = newPos.y;

                shape.transform.scale(info.scaleX, info.scaleY);
                shape.transform.rotate(info.rotate);

                shape.calculateBounds();
            }

            this.lastTransform.copy(this.transform);
        }

        encloseShapes() {
            var aabb: Bounds = this.aabb;
            var oabb: Bounds = this.oabb;

            var numShapes = this.shapes.length;
            var usedShapes = 0;
            var enclosedShapes = this.enclosedShapes;

            aabb.reset();
            enclosedShapes.length = 0;

            this.oldTransforms.length = 0;
            for (var i = 0; i < numShapes; ++i) {
                var shape = this.shapes[i];
                if (shape.layer === null)
                    continue; // shape deleted

                this.oldTransforms[i] = this.shapes[i].transform.clone();

                aabb.enclose(shape.aabb);
                enclosedShapes.push(shape);
                oabb.copy(shape.oabb); // mimic
                usedShapes++;
            }

            if (enclosedShapes.length === 1) {
                oabb.copy(enclosedShapes[0].oabb); // exact copy
            } else if (enclosedShapes.length > 1) {
                oabb.copy(aabb); // for multiple shapes, initial oabb matches aabb
            }

            var transform: Transform = this.transform;
            transform.setIdentity();
            transform.tx = aabb.cx;
            transform.ty = aabb.cy;

            this.lastTransform.copy(transform);

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

    g_propertyPanel.addPropertyList({
        canHandle: (obj: any) => {
            return obj instanceof Shape;
        },
        items: [{
            prop: 'name',
            match: '^[a-zA-Z]\\w*$',
            allowMultiple: false,
            // isValid: function(value) {
            //     return g_Page.isValidShapeName(value);
            // }
        }, {
            prop: 'style',
            type: 'list',
            getList: (): ReferenceItem[] => {
                return g_styleList.getList();
            }
        }]
    });

    // export
    // var g_LayerList: LayerList = null;
}
