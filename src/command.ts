// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {

    //------------------------------
    export interface Command {
        redo();
        undo();
    }

    export class CommandList {
        commands: Command[] = [];
        currentIndex: number = 0;

        // globals
        layer: Layer = null;
        propertyPanel: PropertyPanel = null;
        style: Style = null;

        constructor() {}

        addCommand(command: Command) {
            this.commands.length = this.currentIndex; // clip to the current undo level
            this.commands.push(command);
            this.currentIndex = this.commands.length; // past the end of the list
            command.redo();
        }

        reset() {
            this.commands.length = 0;
            this.currentIndex = 0;
        }

        undo() {
            if (this.currentIndex <= 0)
                return; // nothing left to undo

            this.currentIndex--;
            this.commands[this.currentIndex].undo();
        }

        redo() {
            if (this.currentIndex >= this.commands.length)
                return; // nothing undone

            this.commands[this.currentIndex].redo();
            this.currentIndex++;
        }
    }

    export class ShapeCommand implements Command {
        public shape: Shape = null;

        constructor(public page: Page, public layer: Layer) {}

        redo() {
            this.layer.addShape(this.shape);
            this.page.requestDraw(this.layer);
            // this.commandList.selectList.setSelectedShapes([this.shape]);
            // this.commandList.propertyPanel.setObjects([this.shape], this.onPropertyChanged.bind(this));
        }

        undo() {
            this.layer.removeShape(this.shape);
            this.page.requestDraw(this.layer);

            // what do we set the property panel to display?
        }

        // onPropertyChanged() {
        //     this.layer.refresh();
        // }
    }

    export class RectCommand extends ShapeCommand {

        constructor(page: Page, layer: Layer, cx: number, cy: number, w: number, h: number, style: Style) {
            super(page, layer);

            this.shape = new RectShape("", w, h);
            this.shape.transform.tx = cx;
            this.shape.transform.ty = cy;
            this.shape.style = style;
            this.shape.calculateBounds();
        }
    }

    export class EllipseCommand extends ShapeCommand {

        constructor(page: Page, layer: Layer, cx: number, cy: number, rx: number, ry: number, style: Style) {
            super(page, layer);

            this.shape = new EllipseShape("", rx, ry);
            this.shape.transform.tx = cx;
            this.shape.transform.ty = cy;
            this.shape.style = style;
            this.shape.calculateBounds();
        }
    }

    // handles MoveCommand, RotateCommand, ResizeCommand
    export class TransformCommand implements Command {
        private layers: Layer = null;
        private shapes: Shape[] = [];
        private oldTransforms: Transform[] = [];
        private transforms: Transform[] = [];

        constructor(public page: Page, public layer: Layer, shapes: Shape[], oldTransforms: Transform[]) {
            for (var i: number = 0; i < shapes.length; ++i) {
                this.shapes[i] = shapes[i];
                this.transforms[i] = shapes[i].transform.clone();
                this.oldTransforms[i] = oldTransforms[i].clone();
            }
        }

        redo() {
            for (var i: number = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                shape.transform.copy(this.transforms[i]);
                shape.refresh();
            }
            this.page.requestDraw(this.layer);
        }

        undo() {
            for (var i: number = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                shape.transform.copy(this.oldTransforms[i]);
                shape.refresh();
            }
            this.page.requestDraw(this.layer);
        }
    }

    export class TextCommand implements Command {
        oldText: string;

        constructor(public page: Page, public layer: Layer, public shape: Shape, public text: string) {
            this.oldText = this.shape.text;
        }

        redo() {
            this.shape.text = this.text;
            this.shape.refresh();
            this.page.requestDraw(this.layer);
        }

        undo() {
            this.shape.text = this.oldText;
            this.shape.refresh();
            this.page.requestDraw(this.layer);
        }
    }

    // export class PropertyCommand implements Command {
    //     oldValue: string;

    //     constructor(public propertyInfo: PropertyInfo, public value: string) {
    //         this.oldValue = propertyInfo.object[propertyInfo.name].toString();
    //     }

    //     redo() {
    //         this.setValue(this.value);
    //     }

    //     undo() {
    //         this.setValue(this.oldValue);
    //     }

    //     setValue(value: string) {
    //         var propertyInfo: PropertyInfo = this.propertyInfo;
    //         var type: string = typeof propertyInfo.object[propertyInfo.name];
    //         if (type === "number")
    //             propertyInfo.object[propertyInfo.name] = parseInt(value);
    //         else if (type === "string")
    //             propertyInfo.object[propertyInfo.name] = value;
    //         else
    //             Helper.assert(false); // can't handle this type

    //         g_draw(g_shapeList);
    //         g_draw(g_propertyPanel);
    //     }
    // }

    // TODO this should have nothing to do with the selectList!
    export class DuplicateShapesCommand implements Command {
        shapes: Shape[];
        duplicatedShapes: Shape[];

        constructor(public page: Page, public layer: Layer, shapes: Shape[]) {
            this.shapes = shapes.slice(); // copy
        }

        redo() {
            if (!this.duplicatedShapes) {
                this.duplicatedShapes = this.layer.duplicateShapes(this.shapes);
            } else {
                // re-add the shapes from the previous undo - don't re-duplicate them
                this.layer.addShapes(this.duplicatedShapes);
            }
            this.page.requestDraw(this.layer);
        }

        undo() {
            this.layer.removeShapes(this.duplicatedShapes);
            this.page.requestDraw(this.layer);
        }
    }

    export class DeleteShapesCommand implements Command {
        shapes: Shape[];

        constructor(public page: Page, public layer: Layer, shapes: Shape[]) {
            this.shapes = shapes.slice(); // copy
        }

        redo() {
            this.layer.removeShapes(this.shapes);
            this.page.requestDraw(this.layer);
        }

        undo() {
            this.layer.addShapes(this.shapes);
            this.page.requestDraw(this.layer);
        }
    }

    export enum DistributeStyle {
        None, Left, Right, Top, Bottom, Vertical, Horizontal
    };

    export class DistributeShapesCommand implements Command {
        shapes: Shape[];
        oldTransforms: Transform[] = [];

        constructor(public page: Page, public layer: Layer, shapes: Shape[], public style: DistributeStyle) {
            this.shapes = shapes.slice(); // copy
            for (var i = 0; i < shapes.length; ++i) {
                this.oldTransforms[i] = shapes[i].transform.clone();
            }
        }

        redo() {
            var numShapes = this.shapes.length;
            if (numShapes <= 1)
                return;

            var min = 1e10;
            var max = -1e10;
            for (var i = 0; i < numShapes; ++i) {
                var aabb = this.shapes[i].aabb;

                switch (this.style) {
                    case DistributeStyle.Left:
                        min = Math.min(min, aabb.cx - aabb.hw);
                        break;
                    case DistributeStyle.Right:
                        max = Math.max(max, aabb.cx + aabb.hw);
                        break;
                    case DistributeStyle.Top:
                        min = Math.min(min, aabb.cy - aabb.hh);
                        break;
                    case DistributeStyle.Bottom:
                        max = Math.max(max, aabb.cy + aabb.hh);
                        break;
                    case DistributeStyle.Vertical:
                        min = Math.min(min, aabb.cy);
                        max = Math.max(max, aabb.cy);
                        break;
                    case DistributeStyle.Horizontal:
                        min = Math.min(min, aabb.cx);
                        max = Math.max(max, aabb.cx);
                        break;
                }
            }

            var delta = (max - min) / (numShapes - 1)

            for (var i = 0; i < numShapes; ++i) {
                var shape = this.shapes[i];
                var aabb = shape.aabb;
                var transform = shape.transform;

                switch (this.style) {
                    case DistributeStyle.Left:
                        transform.tx += min - (aabb.cx - aabb.hw);
                        break;
                    case DistributeStyle.Right:
                        transform.tx += max - (aabb.cx + aabb.hw);
                        break;
                    case DistributeStyle.Top:
                        transform.ty += min - (aabb.cy - aabb.hh);
                        break;
                    case DistributeStyle.Bottom:
                        transform.ty += max - (aabb.cy + aabb.hh);
                        break;
                    case DistributeStyle.Vertical:
                        transform.ty += min + delta * i - aabb.cy;
                        break;
                    case DistributeStyle.Horizontal:
                        transform.tx += min + delta * i - aabb.cx;
                        break;
                }

                shape.refresh();
            }

            this.page.requestDraw(this.layer);
        }

        undo() {
            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                shape.transform.copy(this.oldTransforms[i]);
                shape.refresh();
            }

            this.page.requestDraw(this.layer);
        }
    }

    export class MakeSquareShapesCommand implements Command {
        shapes: Shape[];
        oldTransforms: Transform[] = [];

        constructor(public page: Page, public layer: Layer, shapes: Shape[]) {
            this.shapes = shapes.slice(); // copy
            for (var i = 0; i < shapes.length; ++i) {
                this.oldTransforms[i] = shapes[i].transform.clone();
            }
        }

        redo() {
            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                if (shape instanceof RectShape) {
                    var rectShape = < RectShape > shape;
                    var simpleTransform = rectShape.transform.decompose();
                    var scaleW = rectShape.w * simpleTransform.scaleX;
                    var scaleH = rectShape.h * simpleTransform.scaleY;
                    var size = Math.max(scaleW, scaleH);

                    rectShape.transform.scale(size / scaleW, size / scaleH);
                    rectShape.refresh();

                } else if (shape instanceof EllipseShape) {
                    var ellipseShape = < EllipseShape > shape;
                    var simpleTransform = ellipseShape.transform.decompose();
                    var scaleW = ellipseShape.rx * simpleTransform.scaleX;
                    var scaleH = ellipseShape.ry * simpleTransform.scaleY;
                    var size = Math.max(scaleW, scaleH);

                    ellipseShape.transform.scale(size / scaleW, size / scaleH);
                    ellipseShape.refresh();
                }
            }

            this.page.requestDraw(this.layer);
        }

        undo() {
            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                shape.transform.copy(this.oldTransforms[i]);
                shape.refresh();
            }

            this.page.requestDraw(this.layer);
        }
    }

    export
    var g_drawCtx = null;
    export
    var g_Layer = null;
}
