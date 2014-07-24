/// <reference path="_dependencies.ts" />
module LayoutEditor {
    //------------------------------
    export interface Tool {
        onPointer(e: InteractionHelper.Event): boolean;
        onChangeFocus(focus: string);
        draw(ctx);
    }

    export class DrawTool implements Tool {
        public shape: Shape = null;
        public canUse: boolean = false;
        public isDrawing: boolean = false;

        constructor() {}

        public draw(ctx) {
            if (this.shape && this.isDrawing) {
                this.shape.calculateBounds();
                this.shape.draw(ctx);
            }
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
                    this.isDrawing = true;
                    break;

                case InteractionHelper.State.Move:
                    var pos: XY = g_grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
                    this.canUse = true;
                    g_draw(this);
                    break;

                case InteractionHelper.State.End:
                    if (this.canUse) {
                        var newCommand = new RectCommand(
                            this.rectShape.transform.translate.x,
                            this.rectShape.transform.translate.y,
                            this.rectShape.w,
                            this.rectShape.h);
                        g_commandList.addCommand(newCommand);
                        this.canUse = false;
                        g_draw(this);
                    }

                    this.isDrawing = false;
                    isHandled = true;
                    break;
            }
            return isHandled || this.isDrawing;
        }

        public draw(ctx) {
            if (!this.isDrawing)
                return;

            this.rectShape.fromRect(
                Math.min(this.x1, this.x2),
                Math.min(this.y1, this.y2),
                Math.abs(this.x2 - this.x1),
                Math.abs(this.y2 - this.y1));

            super.draw(ctx);

            if (g_grid.snappedX > -1 || g_grid.snappedY > -1) {
                ctx.save();
                g_panZoom.transform(ctx);
                ctx.beginPath();
                g_snapStyle.draw(ctx);
                ctx.moveTo(g_grid.snappedX, 0);
                ctx.lineTo(g_grid.snappedX, 1000);
                ctx.moveTo(0, g_grid.snappedY);
                ctx.lineTo(1000, g_grid.snappedY);
                ctx.stroke();
                ctx.restore();
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
                    this.isDrawing = true;
                    break;
                case InteractionHelper.State.Move:
                    var pos: XY = g_grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
                    this.canUse = true;
                    g_draw(this);
                    break;
                case InteractionHelper.State.End:
                    if (this.canUse) {
                        var newCommand = new EllipseCommand(
                            this.ellipseShape.transform.translate.x,
                            this.ellipseShape.transform.translate.y,
                            this.ellipseShape.rx,
                            this.ellipseShape.ry);
                        g_commandList.addCommand(newCommand);
                        this.canUse = false;
                        g_draw(this);
                    }
                    this.isDrawing = false;
                    isHandled = true;
                    break;
            }

            return isHandled || this.isDrawing;
        }

        public draw(ctx) {
            if (!this.isDrawing)
                return;

            this.ellipseShape.fromRect(
                Math.min(this.x1, this.x2),
                Math.min(this.y1, this.y2),
                Math.abs(this.x2 - this.x1),
                Math.abs(this.y2 - this.y1));
            super.draw(ctx);

            if (g_grid.snappedX > -1 || g_grid.snappedY > -1) {
                ctx.save();
                g_panZoom.transform(ctx);
                ctx.beginPath();
                g_snapStyle.draw(ctx);
                ctx.moveTo(g_grid.snappedX, 0);
                ctx.lineTo(g_grid.snappedX, 1000);
                ctx.moveTo(0, g_grid.snappedY);
                ctx.lineTo(1000, g_grid.snappedY);
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    export class SelectTool implements Tool {
        private aabbShape: AABBShape = new AABBShape();
        private y1: number;
        private x2: number;
        private y2: number;
        private isDrawing: boolean = false;

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
                    this.isDrawing = true;
                    break;
                case InteractionHelper.State.Move:
                    this.aabbShape.x2 = e.x;
                    this.aabbShape.y2 = e.y;
                    this.aabbShape.calculateBounds();
                    g_draw(this);
                    break;
                case InteractionHelper.State.End:
                    var shapes: Shape[] = g_shapeList.getShapesInBounds(this.aabbShape.aabb);
                    if (shapes.length > 0)
                        g_commandList.addCommand(new SelectCommand(shapes, this.aabbShape.aabb.getArea() > 10));
                    this.isDrawing = false;
                    g_draw(this);
                    isHandled = true;
                    break;
            }

            return this.isDrawing || isHandled;
        }

        onChangeFocus(focus: string) {}

        public draw(ctx) {
            if (!this.isDrawing)
                return;

            this.aabbShape.draw(ctx);

            g_selectStyle.draw(ctx);
            var shapes: Shape[] = g_shapeList.getShapesInBounds(this.aabbShape.aabb);
            for (var i = 0; i < shapes.length; ++i) {
                shapes[i].drawSelect(ctx);
            }
        }
    }

    // TODO Should we be able to undo selection?????
    export class SelectCommand implements Command {
        shapes: Shape[] = [];
        oldSelectedShapes: Shape[] = [];

        constructor(shapes: Shape[], public isReplace: boolean = false) {
            this.shapes = shapes.slice();
            this.oldSelectedShapes = g_selectList.getSelectedShapes().slice();
        }

        redo() {
            if (this.isReplace) {
                g_selectList.setSelectedShapes(this.shapes);
            } else {
                g_selectList.setSelectedShapes(this.oldSelectedShapes);
                g_selectList.toggleSelected(this.shapes);
            }
        }

        undo() {
            g_selectList.setSelectedShapes(this.oldSelectedShapes);
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
                        g_draw(this);
                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.shape && this.canUse) {
                        var newCommand = new TransformCommand(this.shape, this.resizeShape.transform);
                        g_commandList.addCommand(newCommand);
                        g_draw(this);
                        isHandled = true;
                    }
                    this.canUse = false;
                    this.shape = null;
                    break;
            }

            return isHandled || this.shape !== null;
        }

        onChangeFocus(focus: string) {}

        public draw(ctx) {
            if (!this.shape)
                return;

            this.resizeShape.draw(ctx);
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
                        g_draw(this);
                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.rotateShape) {
                        var newCommand = new TransformCommand(this.shape, this.rotateShape.transform);
                        g_commandList.addCommand(newCommand);
                        g_draw(this);
                        isHandled = true;
                    }

                    this.rotateShape = null;
                    this.shape = null;
                    break;
            }

            return isHandled || this.rotateShape !== null;
        }

        onChangeFocus(focus: string) {}

        public draw(ctx) {
            if (!this.shape)
                return;

            this.rotateShape.calculateBounds();
            this.rotateShape.draw(ctx);
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
        private moveShape: GroupShape = null;
        private shape: Shape = null;
        private canUse: boolean = false;
        private deltaX: number = 0;
        private deltaY: number = 0;

        constructor() {}

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.shape = g_shapeList.getShapeInXY(e.x, e.y);

                    if (this.shape) {
                        if (!g_selectList.isSelected(this.shape)) {
                            g_selectList.setSelectedShapes([this.shape]);
                        }

                        g_grid.rebuildTabs();
                        this.moveShape = g_selectList.selectGroup.copy();
                        this.deltaX = 0;
                        this.deltaY = 0;

                        g_draw(this);
                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.Move:
                    if (this.shape) {
                        this.deltaX += e.deltaX;
                        this.deltaY += e.deltaY;

                        var delta: XY = this.snapAABBToGrid(this.deltaX, this.deltaY);

                        var oldTransform = g_selectList.selectGroup.transform;
                        var moveTransform = this.moveShape.transform;

                        moveTransform.translate.x = oldTransform.translate.x + delta.x;
                        moveTransform.translate.y = oldTransform.translate.y + delta.y;

                        this.moveShape.applyTransform(); // propagate change to group shapes

                        this.canUse = true;

                        g_draw(this);
                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.shape && this.canUse) {
                        var newCommand = new TransformCommand(g_selectList.selectGroup, this.moveShape.transform);
                        g_commandList.addCommand(newCommand);
                        g_draw(this);
                        isHandled = true;
                    }
                    this.canUse = false;
                    this.shape = null;
                    this.moveShape = null;
                    break;
            }

            return isHandled || this.shape !== null;
        }

        onChangeFocus(focus: string) {}

        public draw(ctx) {
            if (!this.shape)
                return;

            this.moveShape.drawSelect(ctx);

            g_grid.draw(ctx);

        }

        private snapAABBToGrid(dx: number, dy: number): XY {
            // the delta is wrt to the original aabb
            var aabb = g_selectList.selectGroup.aabb;

            var centerX: number = aabb.cx + dx;
            var centerY: number = aabb.cy + dy;
            var left: number = centerX - aabb.hw;
            var top: number = centerY - aabb.hh;
            var right: number = centerX + aabb.hw;
            var bottom: number = centerY + aabb.hh;

            var delta: XY = {
                x: dx,
                y: dy
            };

            g_grid.snappedX = -1;
            g_grid.snappedY = -1;

            var newLeft: number = g_grid.snapX(left);
            if (left !== newLeft) {
                delta.x += newLeft - left;
            } else {
                var newRight: number = g_grid.snapX(right);
                if (right !== newRight) {
                    delta.x += newRight - right;
                } else {
                    var newCenterX: number = g_grid.snapX(aabb.cx);
                    if (newCenterX !== aabb.cx) {
                        delta.x += newCenterX - aabb.cx;
                    }
                }
            }

            var newTop: number = g_grid.snapY(top);
            if (top !== newTop) {
                delta.y += newTop - top;
            } else {
                var newBottom: number = g_grid.snapY(bottom);
                if (bottom !== newBottom) {
                    delta.y += newBottom - bottom;
                } else {
                    var newCenterY: number = g_grid.snapY(aabb.cy);
                    if (newCenterY !== aabb.cy) {
                        delta.y += newCenterY - aabb.cy;
                    }
                }
            }

            return delta;
        }
    }

    export class PanZoomTool implements Tool {
        isDrawing: boolean = false;

        constructor() {

        }

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled = false;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.isDrawing = true;
                    break;

                case InteractionHelper.State.Move:
                    g_panZoom.pan.x += g_panZoom.deltaX;
                    g_panZoom.pan.y += g_panZoom.deltaY;
                    g_draw(g_panZoom);
                    isHandled = true;
                    break;

                case InteractionHelper.State.MouseWheel:
                    var scale = (g_panZoom.deltaY > 0 ? 1 / 1.15 : 1.15);
                    g_panZoom.pan.x += e.x * g_panZoom.zoom * (1 - scale);
                    g_panZoom.pan.y += e.y * g_panZoom.zoom * (1 - scale);
                    g_panZoom.zoom *= scale;

                    g_draw(g_panZoom);
                    isHandled = true;

                    break;

                case InteractionHelper.State.End:
                    this.isDrawing = false;
                    //g_draw(g_panZoom); not needed as we're not clearing anything
                    break;
            }

            return this.isDrawing || isHandled;
        }

        onChangeFocus(focus: string) {}

        draw(ctx) {}
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
                        //this.editShape.style = g_selectStyle; keep the same sgridtyle

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

            return isHandled || this.shape !== null;
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
                g_draw(this);
            }
        }

        onInput(e) {
            if (this.shape === null)
                return;

            this.editShape.text = g_inputMultiLine.value;
            g_draw(this);
        }

        public draw(ctx) {
            if (!this.shape)
                return;

            this.editShape.draw(ctx);
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
                    if (g_panZoom.x < canvasWidth - panelWidth || g_panZoom.x >= canvasWidth) {
                        this.edit(null);
                        break;
                    }

                    var info: PropertyInfo = g_propertyPanel.getPropertyInfoXY(g_panZoom.x, g_panZoom.y);
                    this.edit(info);
                    break;
            }

            return this.editing !== null;
        }

        onChangeFocus(name: string) {

        }

        draw(ctx) {}

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
                    g_draw(g_propertyPanel);
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

    export
    var g_inputText = null;
    export
    var g_inputMultiLine = null;
    export
    var g_inputTextStyle = null;
}
