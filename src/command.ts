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
    export
    var g_commandList: CommandList = new CommandList();

    export class ShapeCommand implements Command {
        public shape: Shape = null;

        redo() {
            g_shapeList.addShape(this.shape);
            g_shapeList.requestDraw(g_drawCtx);

            g_propertyPanel.setObject(this.shape);
            g_propertyPanel.requestDraw();
        }

        undo() {
            g_shapeList.removeShape(this.shape);
            g_shapeList.requestDraw(g_drawCtx);

            // what do we set the property panel to display?
        }
    }

    export class RectCommand extends ShapeCommand {

        constructor(cx: number, cy: number, w: number, h: number) {
            super();

            this.shape = new RectShape(w, h);
            this.shape.transform.translate.x = cx;
            this.shape.transform.translate.y = cy;
            this.shape.setStyle(g_style);
            this.shape.calculateBounds();
        }
    }

    export class EllipseCommand extends ShapeCommand {

        constructor(cx: number, cy: number, rx: number, ry: number) {
            super();

            this.shape = new EllipseShape(rx, ry);
            this.shape.transform.translate.x = cx;
            this.shape.transform.translate.y = cy;
            this.shape.setStyle(g_style);
            this.shape.calculateBounds();
        }
    }

    export class TransformCommand implements Command {
        originalTransform: Transform = new Transform();

        constructor(public shape: Shape, public transform: Transform) {
            Helper.extend(this.originalTransform, shape.transform);
        }

        redo() {
            Helper.extend(this.shape.transform, this.transform);
            this.shape.calculateBounds();
            g_shapeList.requestDraw(g_drawCtx);
        }

        undo() {
            Helper.extend(this.shape.transform, this.originalTransform);
            this.shape.calculateBounds();
            g_shapeList.requestDraw(g_drawCtx);
        }
    }

    export class TextCommand implements Command {
        oldText: string;

        constructor(public shape: Shape, public text: string) {
            this.oldText = this.shape.text;
        }

        redo() {
            this.shape.text = this.text;
            g_shapeList.requestDraw(g_drawCtx);
        }

        undo() {
            this.shape.text = this.oldText;
            g_shapeList.requestDraw(g_drawCtx);
        }
    }

    export class PropertyCommand implements Command {
        oldValue: string;

        constructor(public propertyInfo: PropertyInfo, public value: string) {
            this.oldValue = propertyInfo.object[propertyInfo.name].toString();
        }

        redo() {
            this.setValue(this.value);
            g_shapeList.requestDraw(g_drawCtx);
        }

        undo() {
            this.setValue(this.oldValue);
            g_shapeList.requestDraw(g_drawCtx);
        }

        setValue(value: string) {
            var propertyInfo: PropertyInfo = this.propertyInfo;
            var type: string = typeof propertyInfo.object[propertyInfo.name];
            if (type === "number")
                propertyInfo.object[propertyInfo.name] = parseInt(value);
            else if (type === "string")
                propertyInfo.object[propertyInfo.name] = value;
            else
                Helper.assert(false); // can't handle this type
        }
    }

    export
    var g_drawCtx = null;
}