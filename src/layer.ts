// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {

    //------------------------------
    export class Layer {
        shapes: Shape[] = [];
        id: number = 0;
        ctx = null;
        canvas = null;

        static uniqueID: number = 1;

        constructor(private parentElem: HTMLElement, private width: number, private height: number, public name: string = "") {
            this.id = Layer.uniqueID++;
        }

        startup() {
            this.canvas = document.createElement("canvas");
            this.canvas.classList.add("layout");
            this.canvas.classList.add("hidden");
            this.canvas.setAttribute("data-id", this.id);
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.ctx = this.canvas.getContext("2d");
            this.parentElem.appendChild(this.canvas);
        }

        shutdown() {
            this.parentElem.removeChild(this.canvas);
            this.ctx = null;
            this.canvas = null;
            this.shapes.length = 0;
        }

        hide() {
            if (this.canvas)
                this.canvas.classList.add("hidden");
        }

        show() {
            if (this.canvas)
                this.canvas.classList.remove("hidden");
        }

        draw(panZoom) {
            this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
            for (var i = 0; i < this.shapes.length; ++i)
                this.shapes[i].draw(this.ctx, panZoom);
        }

        addShapes(shapes: Shape[]) {
            for (var i = 0; i < shapes.length; ++i)
                this.addShape(shapes[i]);
        }

        removeShapes(shapes: Shape[]) {
            for (var i = 0; i < shapes.length; ++i)
                this.removeShape(shapes[i]);
        }

        duplicateShapes(shapes: Shape[]): Shape[] {
            var newShapes: Shape[] = [];
            for (var i = 0; i < shapes.length; ++i)
                newShapes.push(this.duplicateShape(shapes[i]));

            return newShapes;
        }

        addShape(shape: Shape) {
            var shapeIndex: number = this.shapes.indexOf(shape);
            if (shapeIndex !== -1)
                return; // already in this layer

            if (shape.layer !== null)
                shape.layer.removeShape(shape);

            this.shapes.push(shape);
            shape.layer = this;
        }

        removeShape(shape: Shape) {
            shape.layer = null;

            var shapeIndex: number = this.shapes.indexOf(shape);
            if (shapeIndex !== -1)
                this.shapes.splice(shapeIndex, 1);
        }

        duplicateShape(shape: Shape): Shape {
            var newShape = shape.clone();
            newShape.makeUnique();
            newShape.transform.tx += 20;
            newShape.calculateBounds();

            this.addShape(newShape);
            return newShape;
        }

        getShapeInXY(x: number, y: number): Shape {
            // in reverse as the last shapes are drawn on top
            for (var i = this.shapes.length - 1; i >= 0; --i) {
                var shape: Shape = this.shapes[i];
                if (shape.isInsideXY(this.ctx, x, y))
                    return shape;
            }

            return null;
        }

        getShapesInBounds(bounds: Bounds): Shape[] {
            var shapes: Shape[] = [];

            // forward, so the list order is the same as the draw order
            for (var i = 0; i < this.shapes.length; ++i) {
                var shape: Shape = this.shapes[i];
                if (shape.isOverlapBounds(bounds)) {
                    shape.isOverlapBounds(bounds);
                    shapes.push(shape);
                }
            }

            return shapes;
        }

        createShape(type: string): Shape {
            switch (type) {
                case "RectShape":
                    return new RectShape("", 0, 0);
                case "EllipseShape":
                    return new EllipseShape("", 0, 0);
                case "AABBShape":
                    return new AABBShape();
            }
        }

        setDimensions(width: number, height: number) {
            this.width = width;
            this.height = height;
            if (this.canvas !== null) {
                this.canvas.width = width;
                this.canvas.height = height;
            }
        }

        saveData(): any {
            var obj = {
                type: "layer",
                name: this.name,
                shapes: []
            };
            for (var i = 0; i < this.shapes.length; ++i) {
                var shape: Shape = this.shapes[i];
                obj.shapes.push(shape.saveData());
            }
            return obj;
        }

        loadData(obj: any) {
            Helper.assert(obj.type === "layer");

            this.name = obj.name;

            for (var i = 0; i < obj.shapes.length; ++i) {
                var shapeSave = obj.shapes[i];
                var newShape: Shape = this.createShape(shapeSave.type);

                newShape.loadData(shapeSave);
                newShape.refresh();

                this.addShape(newShape);
            }
        }
    }

}
