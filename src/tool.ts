/// <reference path="_dependencies.ts" />
module LayoutEditor {
    //------------------------------
    export interface Tool {
        onPointer(e: InteractionHelper.Event): boolean;
        onChangeFocus(focus: string);
    }

    export class DrawTool implements Tool {
        public shape: Shape = null;
        public canUse: boolean = false;

        constructor() {}

        public clear() {
            g_toolCtx.clearRect(0, 0, g_toolCtx.canvas.width, g_toolCtx.canvas.height);
        }

        public draw() {
            this.clear();
            this.shape.calculateBounds();
            this.shape.draw(g_toolCtx);
        }

        onPointer(e: InteractionHelper.Event): boolean {
            return false;
        }

        onChangeFocus(focus: string) {}
    }

    export class RectTool extends DrawTool {
        private rectShape: RectShape = new RectShape(0, 0);
        private x1: number = -1;
        private y1: number = -1;
        private x2: number = -1;
        private y2: number = -1;

        constructor() {
            super();
            this.shape = this.rectShape;
            this.rectShape.style = g_drawStyle;
        }

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    g_grid.rebuildTabs();
                    var pos: XY = g_grid.snapXY(e.x, e.y);
                    this.x1 = pos.x;
                    this.y1 = pos.y;
                    isHandled = true;
                    break;

                case InteractionHelper.State.Move:
                    var pos: XY = g_grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
                    this.canUse = true;
                    this.drawRect();

                    isHandled = true;
                    break;

                case InteractionHelper.State.End:
                    this.clear();
                    if (this.canUse) {
                        var newCommand = new RectCommand(
                            this.rectShape.transform.translate.x,
                            this.rectShape.transform.translate.y,
                            this.rectShape.w,
                            this.rectShape.h);
                        g_commandList.addCommand(newCommand);
                        this.canUse = false;
                    }

                    isHandled = true;
                    break;
            }
            return isHandled;
        }

        private drawRect() {
            this.rectShape.fromRect(
                Math.min(this.x1, this.x2),
                Math.min(this.y1, this.y2),
                Math.abs(this.x2 - this.x1),
                Math.abs(this.y2 - this.y1));

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
        }
    }

    export class EllipseTool extends DrawTool {
        private ellipseShape: EllipseShape = new EllipseShape(0, 0);
        private x1: number;
        private x2: number;
        private y1: number;
        private y2: number;

        constructor() {
            super();
            this.shape = this.ellipseShape;
            this.ellipseShape.style = g_drawStyle;
        }

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    g_grid.rebuildTabs();
                    var pos: XY = g_grid.snapXY(e.x, e.y);
                    this.x1 = pos.x;
                    this.y1 = pos.y;
                    isHandled = true;
                    break;
                case InteractionHelper.State.Move:
                    var pos: XY = g_grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
                    this.canUse = true;
                    this.drawEllipse();
                    isHandled = true;
                    break;
                case InteractionHelper.State.End:
                    this.clear();
                    if (this.canUse) {
                        var newCommand = new EllipseCommand(
                            this.ellipseShape.transform.translate.x,
                            this.ellipseShape.transform.translate.y,
                            this.ellipseShape.rx,
                            this.ellipseShape.ry);
                        g_commandList.addCommand(newCommand);
                        this.canUse = false;
                    }
                    isHandled = true;
                    break;
            }

            return isHandled;
        }

        private drawEllipse() {
            this.ellipseShape.fromRect(
                Math.min(this.x1, this.x2),
                Math.min(this.y1, this.y2),
                Math.abs(this.x2 - this.x1),
                Math.abs(this.y2 - this.y1));
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
        }
    }

    export class SelectTool implements Tool {
        private aabbShape: AABBShape = new AABBShape();
        private y1: number;
        private x2: number;
        private y2: number;

        constructor() {
            this.aabbShape.style = g_selectStyle;
        }

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.aabbShape.x1 = e.x;
                    this.aabbShape.y1 = e.y;
                    this.aabbShape.x2 = e.x;
                    this.aabbShape.y2 = e.y;
                    this.aabbShape.calculateBounds();
                    isHandled = true;
                    break;
                case InteractionHelper.State.Move:
                    this.aabbShape.x2 = e.x;
                    this.aabbShape.y2 = e.y;
                    this.aabbShape.calculateBounds();
                    this.drawSelect();
                    isHandled = true;
                    break;
                case InteractionHelper.State.End:
                    this.clear();
                    var shapes: Shape[] = g_shapeList.getShapesInBounds(this.aabbShape.aabb);
                    if (shapes.length > 0)
                        g_commandList.addCommand(new SelectCommand(shapes));
                    isHandled = true;
                    break;
            }

            return isHandled;
        }

        onChangeFocus(focus: string) {}

        private clear() {
            g_toolCtx.clearRect(0, 0, g_toolCtx.canvas.width, g_toolCtx.canvas.height);
        }

        private drawSelect() {
            this.clear();

            this.aabbShape.draw(g_toolCtx);

            g_shapeList.selectedStyle.draw(g_toolCtx);
            var shapes: Shape[] = g_shapeList.getShapesInBounds(this.aabbShape.aabb);
            for (var i = 0; i < shapes.length; ++i) {
                shapes[i].drawSelect(g_toolCtx);
            }
        }
    }

    export class ResizeTool implements Tool {
        resizeShape: Shape = null;
        shape: Shape = null;
        handle: ResizeTool.HandleFlag = ResizeTool.HandleFlag.None;
        handleSize: number = 20;
        canUse: boolean = false;
        startLocalPos: XY = null;

        constructor() {}

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.shape = g_shapeList.getShapeInXY(e.x, e.y);
                    this.handle = ResizeTool.HandleFlag.None;

                    if (this.shape) {
                        g_grid.rebuildTabs();
                        this.resizeShape = this.shape.copy();
                        this.resizeShape.style = g_selectStyle;

                        var oldOABB: Bounds = this.shape.oabb;
                        var localPos: XY = oldOABB.invXY(e.x, e.y);
                        var handleX = this.handleSize;
                        var handleY = this.handleSize;

                        if (localPos.x + oldOABB.hw < handleX)
                            this.handle = (this.handle | ResizeTool.HandleFlag.Left);
                        else if (oldOABB.hw - localPos.x < handleX)
                            this.handle = (this.handle | ResizeTool.HandleFlag.Right);

                        if (localPos.y + oldOABB.hh < handleY)
                            this.handle = (this.handle | ResizeTool.HandleFlag.Top);
                        else if (oldOABB.hh - localPos.y < handleY)
                            this.handle = (this.handle | ResizeTool.HandleFlag.Bottom);

                        if (this.handle === ResizeTool.HandleFlag.None)
                            this.handle = ResizeTool.HandleFlag.Middle;

                        this.startLocalPos = localPos;
                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.Move:
                    if (this.shape) {
                        var transform = this.resizeShape.transform;
                        var oldTransform = this.shape.transform;
                        var oldOABB = this.shape.oabb;

                        var localPos: XY = oldOABB.invXY(e.x, e.y);
                        var dx = (localPos.x - this.startLocalPos.x);
                        var dy = (localPos.y - this.startLocalPos.y);
                        var sx = dx * oldTransform.scale.x / (oldOABB.hw * 2); // unscaled delta
                        var sy = dy * oldTransform.scale.y / (oldOABB.hh * 2); // unscaled delta
                        var cr = Math.cos(oldOABB.rotate);
                        var sr = Math.sin(oldOABB.rotate);

                        var newX = oldTransform.translate.x;
                        var newY = oldTransform.translate.y;
                        if (this.handle & ResizeTool.HandleFlag.Left) {
                            newX += dx * cr * 0.5;
                            newY += dx * sr * 0.5;
                            transform.scale.x = oldTransform.scale.x - sx;
                        } else if (this.handle & ResizeTool.HandleFlag.Right) {
                            newX += dx * cr * 0.5;
                            newY += dx * sr * 0.5;
                            transform.scale.x = oldTransform.scale.x + sx;
                        }

                        if (this.handle & ResizeTool.HandleFlag.Top) {
                            newX -= dy * sr * 0.5;
                            newY += dy * cr * 0.5;
                            transform.scale.y = oldTransform.scale.y - sy;
                        } else if (this.handle & ResizeTool.HandleFlag.Bottom) {
                            newX -= dy * sr * 0.5;
                            newY += dy * cr * 0.5;
                            transform.scale.y = oldTransform.scale.y + sy;
                        }

                        if (this.handle === ResizeTool.HandleFlag.Middle) {
                            transform.translate.x += e.deltaX;
                            transform.translate.y += e.deltaY;
                        } else {
                            transform.translate.x = newX;
                            transform.translate.y = newY;
                        }

                        this.canUse = this.handle !== ResizeTool.HandleFlag.None;
                        this.drawResize();
                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.shape && this.canUse) {
                        var newCommand = new TransformCommand(this.shape, this.resizeShape.transform);
                        g_commandList.addCommand(newCommand);
                        isHandled = true;
                    }
                    this.clear();
                    this.canUse = false;
                    this.shape = null;
                    break;
            }

            return isHandled;
        }

        onChangeFocus(focus: string) {}

        private clear() {
            g_toolCtx.clearRect(0, 0, g_toolCtx.canvas.width, g_toolCtx.canvas.height);
        }

        private drawResize() {
            this.clear();

            this.resizeShape.draw(g_toolCtx);
        }
    }

    export module ResizeTool {
        export enum HandleFlag {
            None = 0, Left = 1, Right = 2, Top = 4, Bottom = 8, Middle = 16
        };
    }

    export class RotateTool implements Tool {
        shape: Shape = null;
        lastAngle: number = 0;
        rotateShape: Shape = null;
        pivot: XY = {
            x: 0,
            y: 0
        };

        constructor() {

        }

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.shape = g_shapeList.getShapeInXY(e.x, e.y);
                    if (this.shape) {
                        this.rotateShape = this.shape.copy();
                        this.rotateShape.style = g_selectStyle;
                        this.pivot = this.rotateShape.transform.translate;
                        this.lastAngle = this.getAngle(e.x, e.y, this.pivot);
                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.Move:
                    if (this.rotateShape) {
                        var newAngle = this.getAngle(e.x, e.y, this.pivot);
                        this.rotateShape.transform.rotate += newAngle - this.lastAngle;
                        this.lastAngle = newAngle;
                        this.drawRotate();
                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.rotateShape) {
                        var newCommand = new TransformCommand(this.shape, this.rotateShape.transform);
                        g_commandList.addCommand(newCommand);
                        isHandled = true;
                    }

                    this.clear();
                    this.rotateShape = null;
                    this.shape = null;
                    break;
            }

            return isHandled;
        }

        onChangeFocus(focus: string) {}

        private clear() {
            g_toolCtx.clearRect(0, 0, g_toolCtx.canvas.width, g_toolCtx.canvas.height);
        }

        private drawRotate() {
            this.clear();

            this.rotateShape.calculateBounds();
            this.rotateShape.draw(g_toolCtx);
        }

        private getAngle(x: number, y: number, pivot: XY): number {
            var dy = y - pivot.y;
            var dx = x - pivot.x;
            if (Math.abs(dy) < EPSILON && Math.abs(dx) < EPSILON)
                return 0;

            return Math.atan2(dy, dx);
        }
    }

    export class MoveTool implements Tool {
        private moveShape: Shape = null;
        private shape: Shape = null;
        private canUse: boolean = false;
        private deltaX: number = 0;
        private deltaY: number = 0;
        private snappedX: number = 0;
        private snappedY: number = 0;

        constructor() {}

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.shape = g_shapeList.getShapeInXY(e.x, e.y);

                    if (this.shape) {
                        g_grid.rebuildTabs();
                        this.moveShape = this.shape.copy();
                        this.moveShape.style = g_selectStyle;
                        this.deltaX = 0;
                        this.deltaY = 0;
                        isHandled = true;
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
                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.shape && this.canUse) {
                        var newCommand = new TransformCommand(this.shape, this.moveShape.transform);
                        g_commandList.addCommand(newCommand);
                        isHandled = true;
                    }
                    this.canUse = false;
                    this.shape = null;
                    break;
            }

            return isHandled;
        }

        onChangeFocus(focus: string) {}

        private clear() {
            g_toolCtx.clearRect(0, 0, g_toolCtx.canvas.width, g_toolCtx.canvas.height);
        }

        private drawMove() {
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
        }

        private snapAABBToGrid() {
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
        }
    }

    export class PanZoomTool implements Tool {
        constructor() {

        }

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled = false;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    break;

                case InteractionHelper.State.Move:
                    g_panZoom.pan.x += g_panZoom.deltaX;
                    g_panZoom.pan.y += g_panZoom.deltaY;
                    this.drawPanZoom();
                    isHandled = true;
                    break;

                case InteractionHelper.State.MouseWheel:
                    var scale = (g_panZoom.deltaY > 0 ? 0.5 : 2);
                    g_panZoom.pan.x += e.x * g_panZoom.zoom * (1 - scale);
                    g_panZoom.pan.y += e.y * g_panZoom.zoom * (1 - scale);
                    g_panZoom.zoom *= scale;

                    this.drawPanZoom();
                    isHandled = true;
                    break;

                case InteractionHelper.State.End:
                    break;
            }

            return isHandled;
        }

        onChangeFocus(focus: string) {}

        drawPanZoom() {
            g_shapeList.requestDraw(g_drawCtx);
        }
    }

    export class TextTool implements Tool {
        shape: Shape = null;
        editShape: Shape = null;
        inputListener: any = null;

        constructor() {
            var self = this;
            g_inputMultiLine.addEventListener('input', function(e) {
                self.onInput(e);
            });
        }

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;

            switch (e.state) {
                case InteractionHelper.State.DoubleClick:
                    this.shape = g_shapeList.getShapeInXY(e.x, e.y);
                    if (this.shape) {
                        this.editShape = this.shape.copy();
                        var left: string = this.shape.oabb.cx + g_propertyCtx.canvas.offsetLeft + "px";
                        var top: string = this.shape.oabb.cy + g_propertyCtx.canvas.offsetTop + "px";
                        g_inputMultiLine.style.left = left;
                        g_inputMultiLine.style.top = top;
                        g_inputMultiLine.value = this.editShape.text;
                        g_inputMultiLine.focus();
                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.Start:
                    if (this.shape && g_shapeList.getShapeInXY(e.x, e.y) !== this.shape) {
                        this.stopTool();
                        isHandled = true;
                    }
            }

            return isHandled;
        }

        onChangeFocus(focus: string) {
            if (this.shape)
                this.stopTool();
        }

        private stopTool() {
            if (this.shape) {
                var newCommand = new TextCommand(this.shape, this.editShape.text);
                g_commandList.addCommand(newCommand);
                this.shape = null;
                g_inputMultiLine.value = "";
            }
        }

        clear() {
            g_toolCtx.clearRect(0, 0, g_toolCtx.canvas.width, g_toolCtx.canvas.height);
        }

        onInput(e) {
            if (this.shape === null)
                return;

            this.editShape.text = g_inputMultiLine.value;
            this.drawPanZoom();
        }

        drawPanZoom() {
            this.clear();

            this.editShape.draw(g_toolCtx);
        }
    }

    export class PropertyTool implements Tool {
        editing: PropertyInfo = null;
        changed: boolean = false;

        constructor() {
            var self = this;
            g_inputText.addEventListener("input", function(e) {
                self.onInput(e);
            })
            g_inputText.addEventListener("change", function(e) {
                self.onChange(e);
            })
        }

        onPointer(e): boolean {
            var canvasWidth: number = g_propertyCtx.canvas.width;
            var panelWidth: number = g_propertyPanel.width;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    if (e.x < canvasWidth - panelWidth || e.x >= canvasWidth) {
                        this.edit(null);
                        break;
                    }

                    var info: PropertyInfo = g_propertyPanel.getPropertyInfoXY(e.x, e.y);
                    this.edit(info);
                    break;
            }

            return this.editing !== null;
        }

        onChangeFocus(name: string) {

        }

        private onInput(e) {
            if (this.editing) {
                g_propertyPanel.drawEditing(this.editing, g_inputText.value);
                this.changed = true;
            }
        }

        private onChange(e) {
            if (this.editing)
                this.edit(null); // finished
        }

        private edit(propertyInfo: PropertyInfo) {
            if (this.editing === propertyInfo)
                return;

            if (this.editing) {
                if (this.changed) {
                    var newCommand: PropertyCommand = new PropertyCommand(this.editing, g_inputText.value);
                    g_commandList.addCommand(newCommand);
                } else {
                    g_propertyPanel.draw(g_propertyCtx);
                }
            }

            this.editing = propertyInfo;
            this.changed = false;

            if (propertyInfo) {
                g_inputText.value = propertyInfo.object[propertyInfo.name];
                g_propertyPanel.drawEditing(propertyInfo, g_inputText.value);
                //window.prompt(propertyInfo.name, g_inputText.value);
                var left: string = g_propertyCtx.canvas.width - g_propertyPanel.width + g_propertyCtx.canvas.offsetLeft + "px";
                var top: string = propertyInfo.y + g_propertyCtx.canvas.offsetTop + "px";
                g_inputText.style.left = left;
                g_inputText.style.top = top;
                g_inputText.focus();
            }
        }
    }

    // TODO Should we be able to undo selection?????
    export class SelectCommand implements Command {
        selectedShapes: Shape[] = [];

        constructor(public shapes: Shape[]) {
            this.selectedShapes = g_shapeList.getSelectedShapes().slice();
        }

        redo() {
            g_shapeList.setSelectedShapes(this.selectedShapes);
            g_shapeList.toggleSelected(this.shapes);
            g_shapeList.requestDrawSelect(g_toolCtx);
        }

        undo() {
            g_shapeList.setSelectedShapes(this.selectedShapes);
            g_shapeList.requestDrawSelect(g_toolCtx);
        }
    }

    export
    var g_toolCtx = null;
    export
    var g_inputText = null;
    export
    var g_inputMultiLine = null;
    export
    var g_inputTextStyle = null;
}
