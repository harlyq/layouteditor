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
                this.shapes[i].transform.copy(this.transforms[i]);
                this.shapes[i].refresh();
            }
            this.page.requestDraw(this.layer);
        }

        undo() {
            for (var i: number = 0; i < this.shapes.length; ++i) {
                this.shapes[i].transform.copy(this.oldTransforms[i]);
                this.shapes[i].refresh();
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

    export class DuplicateSelectedCommand implements Command {
        oldSelected: Shape[];
        duplicatedShapes: Shape[];

        constructor(public page: Page, public layer: Layer, public selectList: SelectList) {
            this.oldSelected = this.selectList.getSelectedShapes().slice(); // copy
        }

        redo() {
            if (!this.duplicatedShapes) {
                this.duplicatedShapes = this.selectList.duplicateSelected();
            } else {
                // re-add the shapes from the previous undo - don't re-duplicate them
                this.selectList.layer.addShapes(this.duplicatedShapes);
            }
            this.selectList.setSelectedShapes(this.duplicatedShapes);
            this.page.requestDraw(this.layer);
        }

        undo() {
            this.selectList.deleteSelected();
            this.selectList.setSelectedShapes(this.oldSelected);
            this.page.requestDraw(this.layer);
        }
    }

    export class DeleteSelectedCommand implements Command {
        oldSelected: Shape[];
        oldLayer: Layer;

        constructor(public page: Page, public layer: Layer, public selectList: SelectList) {
            this.oldSelected = this.selectList.getSelectedShapes().slice();
            this.oldLayer = this.selectList.layer;
        }

        redo() {
            this.selectList.deleteSelected();
            this.page.requestDraw(this.layer);
        }

        undo() {
            this.oldLayer.addShapes(this.oldSelected);
            this.selectList.setSelectedShapes(this.oldSelected);
            this.page.requestDraw(this.layer);
        }
    }

    export
    var g_drawCtx = null;
    export
    var g_Layer = null;
}
