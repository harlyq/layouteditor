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
            this.rectShape.setStyle(g_drawStyle);
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
                            this.rectShape.transform.tx,
                            this.rectShape.transform.ty,
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
            this.ellipseShape.setStyle(g_drawStyle);
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
                            this.ellipseShape.transform.tx,
                            this.ellipseShape.transform.ty,
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
            this.aabbShape.setStyle(g_selectStyle);
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
                    g_selectList.setSelectedShapes(shapes);
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

    export class ResizeTool implements Tool {
        isDrawing: boolean = false;
        handleSize: number = 20;

        private handle: ResizeTool.HandleFlag = ResizeTool.HandleFlag.None;
        private canUse: boolean = false;
        private startLocalPos: XY = null;
        private oldInfo: SimpleTransform = null;
        private oldTransform: Transform = new Transform();
        private deltaX: number = 0;
        private deltaY: number = 0;
        private oldOABB: Bounds = new Bounds();
        private oldShapeTransforms: Transform[] = [];

        constructor() {}

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    var shape: Shape = g_shapeList.getShapeInXY(e.x, e.y);
                    this.handle = ResizeTool.HandleFlag.None;

                    if (shape) {
                        if (!g_selectList.isSelected(shape)) {
                            g_selectList.setSelectedShapes([shape]);
                        }
                    }

                    var selectGroup: GroupShape = g_selectList.selectGroup;
                    if (selectGroup.isInsideOABBXY(e.x, e.y)) {
                        g_selectList.hideSelected(); // hide before rebuilding tabs, so we don't include them
                        g_grid.rebuildTabs();

                        this.oldOABB.copy(selectGroup.oabb);
                        this.oldTransform.copy(selectGroup.transform);

                        var shapes: Shape[] = g_selectList.selectGroup.shapes;
                        for (var i: number = 0; i < shapes.length; ++i) {
                            this.oldShapeTransforms[i] = shapes[i].transform.clone();
                        }

                        var oldOABB: Bounds = this.oldOABB;
                        var localPos: XY = oldOABB.invXY(e.x, e.y);
                        var handleX = this.handleSize;
                        var handleY = this.handleSize;
                        this.oldInfo = selectGroup.transform.decompose();

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
                        this.isDrawing = true;
                        this.deltaX = 0;
                        this.deltaY = 0;
                    }
                    break;

                case InteractionHelper.State.Move:
                    if (this.isDrawing) {
                        var transform = g_selectList.selectGroup.transform;
                        var oldOABB = this.oldOABB;
                        var oldInfo = this.oldInfo;

                        var localPos: XY = oldOABB.invXY(e.x, e.y);
                        var dx = (localPos.x - this.startLocalPos.x);
                        var dy = (localPos.y - this.startLocalPos.y);
                        var sx = dx * oldInfo.scaleX / (oldOABB.hw * 2); // unscaled delta
                        var sy = dy * oldInfo.scaleY / (oldOABB.hh * 2); // unscaled delta
                        var cr = Math.cos(oldOABB.rotate);
                        var sr = Math.sin(oldOABB.rotate);

                        var newX = oldInfo.tx;
                        var newY = oldInfo.ty;
                        var newScaleX = oldInfo.scaleX;
                        var newScaleY = oldInfo.scaleY;

                        if (this.handle & ResizeTool.HandleFlag.Left) {
                            newX += dx * cr * 0.5;
                            newY += dx * sr * 0.5;
                            newScaleX -= sx;
                        } else if (this.handle & ResizeTool.HandleFlag.Right) {
                            newX += dx * cr * 0.5;
                            newY += dx * sr * 0.5;
                            newScaleX += sx;
                        }

                        if (this.handle & ResizeTool.HandleFlag.Top) {
                            newX -= dy * sr * 0.5;
                            newY += dy * cr * 0.5;
                            newScaleY -= sy;
                        } else if (this.handle & ResizeTool.HandleFlag.Bottom) {
                            newX -= dy * sr * 0.5;
                            newY += dy * cr * 0.5;
                            newScaleY += sy;
                        }

                        if (this.handle === ResizeTool.HandleFlag.Middle) {
                            this.deltaX += e.deltaX;
                            this.deltaY += e.deltaY;
                            newX += this.deltaX;
                            newY += this.deltaY;
                        }

                        transform.setIdentity();
                        transform.scale(newScaleX, newScaleY);
                        transform.rotate(this.oldInfo.rotate);
                        transform.translate(newX, newY)

                        g_selectList.selectGroup.calculateBounds();
                        this.canUse = this.handle !== ResizeTool.HandleFlag.None;
                        g_draw(this);
                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.isDrawing && this.canUse) {
                        var newCommand = new TransformCommand(g_selectList.selectGroup.shapes, this.oldShapeTransforms);
                        g_commandList.addCommand(newCommand);
                        g_selectList.showSelected();
                        g_draw(this);
                        isHandled = true;
                    }
                    this.canUse = false;
                    this.isDrawing = false;
                    this.oldShapeTransforms.length = 0;
                    break;
            }

            return isHandled || this.isDrawing;
        }

        onChangeFocus(focus: string) {}

        public draw(ctx) {
            if (!this.isDrawing)
                return;

            for (var i: number = 0; i < g_selectList.selectedShapes.length; ++i) {
                g_selectList.selectedShapes[i].draw(ctx); // draw the shape in the tool context
            }
        }
    }

    export module ResizeTool {
        export enum HandleFlag {
            None = 0, Left = 1, Right = 2, Top = 4, Bottom = 8, Middle = 16
        };
    }

    export class RotateTool implements Tool {
        private lastAngle: number = 0;
        private pivotX: number = 0;
        private pivotY: number = 0;
        private oldTransform: Transform = new Transform();
        private oldShapeTransforms: Transform[] = [];

        isDrawing: boolean = false;

        constructor() {

        }

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    var shape: Shape = g_shapeList.getShapeInXY(e.x, e.y);
                    if (shape) {
                        if (!g_selectList.isSelected(shape)) {
                            g_selectList.setSelectedShapes([shape]);
                        }
                    }

                    var selectGroup: GroupShape = g_selectList.selectGroup;
                    if (selectGroup.isInsideOABBXY(e.x, e.y)) {
                        g_selectList.hideSelected();

                        this.oldTransform.copy(selectGroup.transform);

                        var shapes: Shape[] = g_selectList.selectGroup.shapes;
                        for (var i: number = 0; i < shapes.length; ++i) {
                            this.oldShapeTransforms[i] = shapes[i].transform.clone();
                        }

                        this.pivotX = selectGroup.transform.tx;
                        this.pivotY = selectGroup.transform.tx;
                        this.lastAngle = this.getAngle(e.x, e.y, this.pivotX, this.pivotY);
                        this.isDrawing = true;
                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.Move:
                    if (this.isDrawing) {
                        var newAngle = this.getAngle(e.x, e.y, this.pivotX, this.pivotY);
                        g_selectList.selectGroup.transform.rotate(newAngle - this.lastAngle);
                        g_selectList.selectGroup.calculateBounds();
                        g_draw(this);

                        isHandled = true;
                        this.lastAngle = newAngle;
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.isDrawing) {
                        var newCommand = new TransformCommand(g_selectList.selectGroup.shapes, this.oldShapeTransforms);
                        g_commandList.addCommand(newCommand);
                        g_selectList.showSelected();
                        g_draw(this);
                        isHandled = true;
                        this.isDrawing = false;
                    }

                    break;
            }

            return isHandled || this.isDrawing;
        }

        onChangeFocus(focus: string) {}

        public draw(ctx) {
            if (!this.isDrawing)
                return;

            for (var i: number = 0; i < g_selectList.selectedShapes.length; ++i) {
                g_selectList.selectedShapes[i].draw(ctx); // draw the shape in the tool context
            }
        }

        private getAngle(x: number, y: number, px: number, py: number): number {
            var dx = x - px;
            var dy = y - py;
            if (Math.abs(dy) < EPSILON && Math.abs(dx) < EPSILON)
                return 0;

            return Math.atan2(dy, dx);
        }
    }

    export class MoveTool implements Tool {
        private shape: Shape = null;
        private canUse: boolean = false;
        private deltaX: number = 0;
        private deltaY: number = 0;
        private oldTransform: Transform = new Transform();
        private oldAABB: Bounds = new Bounds();
        private oldShapeTransforms: Transform[] = [];

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

                        var shapes: Shape[] = g_selectList.selectGroup.shapes;
                        for (var i: number = 0; i < shapes.length; ++i) {
                            this.oldShapeTransforms[i] = shapes[i].transform.clone();
                        }

                        g_selectList.hideSelected(); // hide before rebuilding tabs, so we don't include them
                        g_grid.rebuildTabs();
                        this.oldTransform.copy(g_selectList.selectGroup.transform);
                        this.oldAABB.copy(g_selectList.selectGroup.aabb);
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

                        var moveTransform = g_selectList.selectGroup.transform;

                        moveTransform.tx = this.oldTransform.tx + delta.x;
                        moveTransform.ty = this.oldTransform.ty + delta.y;

                        g_selectList.selectGroup.calculateBounds();

                        this.canUse = true;

                        g_draw(this);
                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.shape && this.canUse) {
                        var newCommand = new TransformCommand(g_selectList.selectGroup.shapes, this.oldShapeTransforms);
                        g_commandList.addCommand(newCommand);
                        g_selectList.showSelected();
                        g_draw(this);
                        g_grid.clearSnap();
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

            for (var i: number = 0; i < g_selectList.selectedShapes.length; ++i) {
                g_selectList.selectedShapes[i].draw(ctx); // draw the shape in the tool context
            }

            g_grid.draw(ctx);
        }

        private snapAABBToGrid(dx: number, dy: number): XY {
            // the delta is wrt to the original aabb
            var aabb = this.oldAABB;

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

            var newLeft: number = g_grid.snapX(left);
            if (left !== newLeft) {
                delta.x += newLeft - left;
            } else {
                var newRight: number = g_grid.snapX(right);
                if (right !== newRight) {
                    delta.x += newRight - right;
                } else {
                    var newCenterX: number = g_grid.snapX(centerX);
                    if (newCenterX !== centerX) {
                        delta.x += newCenterX - centerX;
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
                    var newCenterY: number = g_grid.snapY(centerY);
                    if (newCenterY !== centerY) {
                        delta.y += newCenterY - centerY;
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
                    g_panZoom.panX += g_panZoom.deltaX;
                    g_panZoom.panY += g_panZoom.deltaY;
                    g_draw(g_panZoom);
                    isHandled = true;
                    break;

                case InteractionHelper.State.MouseWheel:
                    var scale = (g_panZoom.deltaY > 0 ? 1 / 1.15 : 1.15);
                    g_panZoom.panX += e.x * g_panZoom.zoom * (1 - scale);
                    g_panZoom.panY += e.y * g_panZoom.zoom * (1 - scale);
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

                        // TODO remove dependency on g_toolCtx
                        var left: string = this.shape.oabb.cx + g_toolCtx.canvas.offsetLeft + "px";
                        var top: string = this.shape.oabb.cy + g_toolCtx.canvas.offsetTop + "px";
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

    export
    var g_inputMultiLine = null;

    export
    var g_toolCtx = null;
}
