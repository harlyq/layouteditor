// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {
    //------------------------------
    export class Tool {
        isUsing: boolean = false;

        constructor(public toolLayer: ToolLayer) {}

        onPointer(e: InteractionHelper.Event): boolean {
            return false;
        }
        draw(ctx) {}

        refresh() {}
    }

    export class DrawTool extends Tool {
        public shape: Shape = null;
        public canUse: boolean = false;

        constructor(toolLayer: ToolLayer) {
            super(toolLayer);
        }

        public draw(ctx) {
            if (this.shape && this.isUsing) {
                this.shape.draw(ctx, this.toolLayer.page.panZoom);
            }
        }

        onPointer(e: InteractionHelper.Event): boolean {
            return false;
        }

    }

    export class RectTool extends DrawTool {
        private rectShape: RectShape = new RectShape("_RectTool", 0, 0);
        private x1: number = -1;
        private y1: number = -1;
        private x2: number = -1;
        private y2: number = -1;

        constructor(toolLayer: ToolLayer) {
            super(toolLayer);
            this.shape = this.rectShape;
            this.rectShape.style = this.toolLayer.style;
        }

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;
            var grid = this.toolLayer.grid;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    grid.rebuildTabs([this.toolLayer.layer]);
                    var pos: XY = grid.snapXY(e.x, e.y);
                    this.x1 = this.x2 = pos.x;
                    this.y1 = this.y2 = pos.y;
                    this.isUsing = true;
                    break;

                case InteractionHelper.State.Move:
                    var pos: XY = grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
                    this.canUse = true;
                    break;

                case InteractionHelper.State.End:
                    if (this.canUse) {
                        var toolLayer = this.toolLayer;
                        var newCommand = new RectCommand(
                            toolLayer.page,
                            toolLayer.layer,
                            this.rectShape.transform.tx,
                            this.rectShape.transform.ty,
                            this.rectShape.w,
                            this.rectShape.h,
                            toolLayer.style);
                        toolLayer.commandList.addCommand(newCommand);
                        toolLayer.selectList.setSelectedShapes([newCommand.shape]);
                        this.canUse = false;
                    }

                    this.isUsing = false;
                    isHandled = true;
                    break;
            }
            return isHandled || this.isUsing;
        }

        public draw(ctx) {
            if (!this.isUsing)
                return;

            this.rectShape.fromRect(
                Math.min(this.x1, this.x2),
                Math.min(this.y1, this.y2),
                Math.abs(this.x2 - this.x1),
                Math.abs(this.y2 - this.y1));

            super.draw(ctx);
        }
    }

    export class EllipseTool extends DrawTool {
        private ellipseShape: EllipseShape = new EllipseShape("_EllipseTool", 0, 0);
        private x1: number;
        private x2: number;
        private y1: number;
        private y2: number;

        constructor(toolLayer: ToolLayer) {
            super(toolLayer);
            this.shape = this.ellipseShape;
            this.ellipseShape.style = this.toolLayer.style;
        }

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;
            var grid = this.toolLayer.grid;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    grid.rebuildTabs([this.toolLayer.layer]);
                    var pos: XY = grid.snapXY(e.x, e.y);
                    this.x1 = this.x2 = pos.x;
                    this.y1 = this.y2 = pos.y;
                    this.isUsing = true;
                    break;

                case InteractionHelper.State.Move:
                    var pos: XY = grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
                    this.canUse = true;
                    break;

                case InteractionHelper.State.End:
                    if (this.isUsing) {
                        if (this.canUse) {
                            var toolLayer = this.toolLayer;
                            var newCommand = new EllipseCommand(
                                toolLayer.page,
                                toolLayer.layer,
                                this.ellipseShape.transform.tx,
                                this.ellipseShape.transform.ty,
                                this.ellipseShape.rx,
                                this.ellipseShape.ry,
                                toolLayer.style);

                            toolLayer.commandList.addCommand(newCommand);
                            toolLayer.selectList.setSelectedShapes([newCommand.shape]);
                            this.canUse = false;
                        }
                        this.isUsing = false;
                        isHandled = true;
                    }
                    break;
            }

            return isHandled || this.isUsing;
        }

        public draw(ctx) {
            if (!this.isUsing)
                return;

            this.ellipseShape.fromRect(
                Math.min(this.x1, this.x2),
                Math.min(this.y1, this.y2),
                Math.abs(this.x2 - this.x1),
                Math.abs(this.y2 - this.y1));

            super.draw(ctx);
        }
    }

    export class SelectTool extends Tool {
        private aabbShape: AABBShape = new AABBShape();
        private y1: number;
        private x2: number;
        private y2: number;

        constructor(toolLayer: ToolLayer) {
            super(toolLayer);
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
                    this.aabbShape.refresh();
                    this.isUsing = true;
                    break;

                case InteractionHelper.State.Move:
                    if (this.isUsing) {
                        this.aabbShape.x2 = e.x;
                        this.aabbShape.y2 = e.y;
                        this.aabbShape.refresh();
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.isUsing) {
                        var self = this;
                        var shapes: Shape[] = this.toolLayer.layer.getShapesInBounds(this.aabbShape.aabb);
                        this.toolLayer.selectList.setSelectedShapes(shapes);

                        this.isUsing = false;

                        isHandled = true;
                    }
                    break;
            }

            return this.isUsing || isHandled;
        }

        public draw(ctx) {
            if (!this.isUsing)
                return;

            this.aabbShape.draw(ctx, this.toolLayer.page.panZoom);

            g_selectStyle.drawShape(ctx);
            var shapes: Shape[] = this.toolLayer.layer.getShapesInBounds(this.aabbShape.aabb);
            for (var i = 0; i < shapes.length; ++i) {
                shapes[i].drawSelect(ctx, this.toolLayer.page.panZoom);
            }
        }
    }

    export class ResizeTool extends Tool {
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

        constructor(toolLayer: ToolLayer) {
            super(toolLayer);
        }

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    var shape: Shape = this.toolLayer.layer.getShapeInXY(e.x, e.y);
                    this.handle = ResizeTool.HandleFlag.None;

                    if (shape) {
                        if (!this.toolLayer.selectList.isSelected(shape)) {
                            this.toolLayer.selectList.setSelectedShapes([shape]);
                        }
                    }

                    var selectGroup: GroupShape = this.toolLayer.selectList.selectGroup;
                    if (selectGroup.isInsideOABBXY(e.x, e.y)) {
                        this.toolLayer.moveSelectToToolLayer();
                        this.toolLayer.grid.rebuildTabs([this.toolLayer.layer]);

                        this.oldOABB.copy(selectGroup.oabb);
                        this.oldTransform.copy(selectGroup.transform);

                        var shapes: Shape[] = this.toolLayer.selectList.selectGroup.shapes;
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
                        this.isUsing = true;
                        this.deltaX = 0;
                        this.deltaY = 0;

                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.Move:
                    if (this.isUsing) {
                        var transform = this.toolLayer.selectList.selectGroup.transform;
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

                        this.canUse = this.handle !== ResizeTool.HandleFlag.None;

                        this.toolLayer.selectList.selectGroup.refresh();
                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.isUsing) {
                        var toolLayer = this.toolLayer;

                        if (this.canUse) {
                            var newCommand = new TransformCommand(
                                toolLayer.page,
                                toolLayer.layer,
                                toolLayer.selectList.selectGroup.shapes,
                                this.oldShapeTransforms);
                            toolLayer.commandList.addCommand(newCommand);
                        }
                        toolLayer.moveSelectToLayer();
                        isHandled = true;

                        this.canUse = false;
                        this.isUsing = false;
                        this.oldShapeTransforms.length = 0;
                    }
                    break;
            }

            return isHandled || this.isUsing;
        }

        public draw(ctx) {
            if (!this.isUsing)
                return;

            for (var i: number = 0; i < this.toolLayer.selectList.selectedShapes.length; ++i) {
                this.toolLayer.selectList.selectedShapes[i].draw(ctx, this.toolLayer.page.panZoom); // draw the shape in the tool context
            }
        }
    }

    export module ResizeTool {
        export enum HandleFlag {
            None = 0, Left = 1, Right = 2, Top = 4, Bottom = 8, Middle = 16
        };
    }

    export class RotateTool extends Tool {
        private lastAngle: number = 0;
        private pivotX: number = 0;
        private pivotY: number = 0;
        private oldTransform: Transform = new Transform();
        private oldShapeTransforms: Transform[] = [];

        constructor(toolLayer: ToolLayer) {
            super(toolLayer);
        }

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    var shape: Shape = this.toolLayer.layer.getShapeInXY(e.x, e.y);
                    if (shape) {
                        if (!this.toolLayer.selectList.isSelected(shape)) {
                            this.toolLayer.selectList.setSelectedShapes([shape]);
                        }
                    }

                    var selectGroup: GroupShape = this.toolLayer.selectList.selectGroup;
                    if (selectGroup.isInsideOABBXY(e.x, e.y)) {
                        this.toolLayer.moveSelectToToolLayer();

                        this.oldTransform.copy(selectGroup.transform);

                        var shapes: Shape[] = this.toolLayer.selectList.selectGroup.shapes;
                        for (var i: number = 0; i < shapes.length; ++i) {
                            this.oldShapeTransforms[i] = shapes[i].transform.clone();
                        }

                        this.pivotX = selectGroup.transform.tx;
                        this.pivotY = selectGroup.transform.tx;
                        this.lastAngle = this.getAngle(e.x, e.y, this.pivotX, this.pivotY);
                        this.isUsing = true;

                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.Move:
                    if (this.isUsing) {
                        var newAngle = this.getAngle(e.x, e.y, this.pivotX, this.pivotY);
                        this.toolLayer.selectList.selectGroup.transform.rotate(newAngle - this.lastAngle);
                        this.toolLayer.selectList.selectGroup.refresh();

                        isHandled = true;
                        this.lastAngle = newAngle;
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.isUsing) {
                        var toolLayer = this.toolLayer;
                        var newCommand = new TransformCommand(
                            toolLayer.page,
                            toolLayer.layer,
                            toolLayer.selectList.selectGroup.shapes,
                            this.oldShapeTransforms);
                        toolLayer.commandList.addCommand(newCommand);
                        toolLayer.moveSelectToLayer();
                        isHandled = true;
                        this.isUsing = false;
                    }

                    break;
            }

            return isHandled || this.isUsing;
        }

        public draw(ctx) {
            if (!this.isUsing)
                return;

            for (var i: number = 0; i < this.toolLayer.selectList.selectedShapes.length; ++i) {
                this.toolLayer.selectList.selectedShapes[i].draw(ctx, this.toolLayer.page.panZoom); // draw the shape in the tool context
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

    export class MoveTool extends Tool {
        private shape: Shape = null;
        private canUse: boolean = false;
        private deltaX: number = 0;
        private deltaY: number = 0;
        private oldTransform: Transform = new Transform();
        private oldAABB: Bounds = new Bounds();
        private oldShapeTransforms: Transform[] = [];

        constructor(toolLayer: ToolLayer) {
            super(toolLayer);
        }

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.shape = this.toolLayer.layer.getShapeInXY(e.x, e.y);

                    if (this.shape) {
                        if (!this.toolLayer.selectList.isSelected(this.shape)) {
                            this.toolLayer.selectList.setSelectedShapes([this.shape]);
                        }

                        var shapes: Shape[] = this.toolLayer.selectList.selectGroup.shapes;
                        for (var i: number = 0; i < shapes.length; ++i) {
                            this.oldShapeTransforms[i] = shapes[i].transform.clone();
                        }

                        this.toolLayer.moveSelectToToolLayer(); // hide before rebuilding tabs, so we don't include them
                        this.toolLayer.grid.rebuildTabs([this.toolLayer.layer]);
                        this.oldTransform.copy(this.toolLayer.selectList.selectGroup.transform);
                        this.oldAABB.copy(this.toolLayer.selectList.selectGroup.aabb);
                        this.deltaX = 0;
                        this.deltaY = 0;
                        this.isUsing = true;

                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.Move:
                    if (this.shape) {
                        this.deltaX += e.deltaX;
                        this.deltaY += e.deltaY;

                        var delta: XY = this.snapAABBToGrid(this.deltaX, this.deltaY);

                        var moveTransform = this.toolLayer.selectList.selectGroup.transform;

                        moveTransform.tx = this.oldTransform.tx + delta.x;
                        moveTransform.ty = this.oldTransform.ty + delta.y;

                        this.toolLayer.selectList.selectGroup.refresh();

                        this.canUse = true;

                        isHandled = true;
                    }
                    break;

                case InteractionHelper.State.End:
                    if (this.isUsing) {
                        var toolLayer = this.toolLayer;
                        if (this.canUse) {
                            var newCommand = new TransformCommand(
                                toolLayer.page,
                                toolLayer.layer,
                                toolLayer.selectList.selectGroup.shapes,
                                this.oldShapeTransforms);
                            toolLayer.commandList.addCommand(newCommand);
                        }
                        toolLayer.moveSelectToLayer();
                        toolLayer.grid.clearSnap();

                        this.canUse = false;
                        this.shape = null;
                        this.isUsing = false;

                        isHandled = true;
                    }
                    break;
            }

            return isHandled || this.shape !== null;
        }

        public draw(ctx) {
            if (!this.isUsing)
                return;

            for (var i: number = 0; i < this.toolLayer.selectList.selectedShapes.length; ++i) {
                this.toolLayer.selectList.selectedShapes[i].draw(ctx, this.toolLayer.page.panZoom); // draw the shape in the tool context
            }
        }

        private snapAABBToGrid(dx: number, dy: number): XY {
            // the delta is wrt to the original aabb
            var aabb = this.oldAABB;
            var grid = this.toolLayer.grid;

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

            var newLeft: number = grid.snapX(left);
            if (left !== newLeft) {
                delta.x += newLeft - left;
            } else {
                var newRight: number = grid.snapX(right);
                if (right !== newRight) {
                    delta.x += newRight - right;
                } else {
                    var newCenterX: number = grid.snapX(centerX);
                    if (newCenterX !== centerX) {
                        delta.x += newCenterX - centerX;
                    }
                }
            }

            var newTop: number = grid.snapY(top);
            if (top !== newTop) {
                delta.y += newTop - top;
            } else {
                var newBottom: number = grid.snapY(bottom);
                if (bottom !== newBottom) {
                    delta.y += newBottom - bottom;
                } else {
                    var newCenterY: number = grid.snapY(centerY);
                    if (newCenterY !== centerY) {
                        delta.y += newCenterY - centerY;
                    }
                }
            }

            return delta;
        }
    }

    export class PanZoomTool extends Tool {
        constructor(toolLayer: ToolLayer) {
            super(toolLayer);
        }

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled = false;
            var panZoom = this.toolLayer.page.panZoom;

            switch (e.state) {
                case InteractionHelper.State.Start:
                    this.isUsing = true;
                    break;

                case InteractionHelper.State.Move:
                    panZoom.panX += panZoom.deltaX;
                    panZoom.panY += panZoom.deltaY;

                    isHandled = true;
                    break;

                case InteractionHelper.State.MouseWheel:
                    var scale = (panZoom.deltaY > 0 ? 1 / 1.15 : 1.15);
                    panZoom.panX += e.x * panZoom.zoom * (1 - scale);
                    panZoom.panY += e.y * panZoom.zoom * (1 - scale);
                    panZoom.zoom *= scale;

                    isHandled = true;
                    break;

                case InteractionHelper.State.End:
                    this.isUsing = false;
                    break;
            }

            if (this.isUsing || isHandled) {
                this.toolLayer.page.requestDraw();
            }

            return this.isUsing || isHandled;
        }

        draw(ctx) {}
    }

    export class TextTool extends Tool {
        shape: Shape = null;
        editShape: Shape = null;
        inputListener: any = null;

        constructor(toolLayer: ToolLayer) {
            super(toolLayer);

            g_inputMultiLine.addEventListener('input', this.onInput.bind(this));

        }

        onPointer(e: InteractionHelper.Event): boolean {
            var isHandled: boolean = false;

            switch (e.state) {
                case InteractionHelper.State.DoubleClick:
                    var toolLayer = this.toolLayer;
                    this.shape = toolLayer.layer.getShapeInXY(e.x, e.y);
                    if (this.shape) {
                        this.editShape = this.shape.clone();

                        var left: string = this.shape.oabb.cx + toolLayer.canvas.offsetLeft + "px";
                        var top: string = this.shape.oabb.cy + toolLayer.canvas.offsetTop + "px";
                        g_inputMultiLine.style.left = left;
                        g_inputMultiLine.style.top = top;
                        g_inputMultiLine.value = this.editShape.text;
                        g_inputMultiLine.style.display = "block";
                        g_inputMultiLine.focus();
                        isHandled = true;

                        this.isUsing = true;
                    }
                    break;

                case InteractionHelper.State.Start:
                    if (this.shape && this.toolLayer.layer.getShapeInXY(e.x, e.y) !== this.shape) {
                        this.stopTool();
                        this.isUsing = false;

                        // don't mark this as handled to permit another tool to use this
                        // Start event e.g. we stop writing text because we are making a selection lasso
                        // isHandled = true;
                    }
            }

            return isHandled || this.isUsing;
        }

        private stopTool() {
            if (this.shape) {
                var toolLayer = this.toolLayer;
                var newCommand = new TextCommand(toolLayer.page, toolLayer.layer, this.shape, this.editShape.text);
                toolLayer.commandList.addCommand(newCommand);

                this.shape = null;
                this.isUsing = false;

                g_inputMultiLine.value = "";
                g_inputMultiLine.style.display = "none";
            }
        }

        onInput(e) {
            if (this.shape === null)
                return;

            this.editShape.text = g_inputMultiLine.value;
            this.toolLayer.draw();
            this.draw(this.toolLayer.ctx);
        }

        public draw(ctx) {
            if (!this.isUsing)
                return;

            this.editShape.draw(ctx, this.toolLayer.page.panZoom);
        }
    }


    export
    var g_inputMultiLine = null;
}
