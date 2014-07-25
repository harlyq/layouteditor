/// <reference path="helper.ts" />
module LayoutEditor {

    //------------------------------
    export class PanZoom {
        pan: XY = {
            x: 0,
            y: 0
        }
        zoom: number = 1;

        // raw input values
        x: number = 0;
        y: number = 0;
        deltaX: number = 0;
        deltaY: number = 0;
        pinchDistance: number = 0;

        constructor() {}

        reset() {
            this.constructor();
        }

        toX(x: number): number {
            return (x - this.pan.x) / this.zoom;
        }
        toY(y: number): number {
            return (y - this.pan.y) / this.zoom;
        }
        toH(h: number): number {
            return h / this.zoom;
        }
        toW(w: number): number {
            return w / this.zoom;
        }

        calcXY(x: number, y: number): XY {
            var newPos: XY = {
                x: 0,
                y: 0
            };
            newPos.x = x * this.zoom + this.pan.x;
            newPos.y = y * this.zoom + this.pan.y;
            return newPos;
        }

        invXY(x: number, y: number): XY {
            var invPos: XY = {
                x: 0,
                y: 0
            };
            invPos.x = (x - this.pan.x) / this.zoom;
            invPos.y = (y - this.pan.y) / this.zoom;
            return invPos;
        }

        translate(ctx, x: number, y: number) {
            ctx.translate(x * this.zoom + this.pan.x, y * this.zoom + this.pan.y);
        }

        scale(ctx, x: number, y: number) {
            ctx.scale(x * this.zoom, y * this.zoom);
        }

        transform(ctx, tx: number = 0, ty: number = 0, rotate: number = 0, sx: number = 1, sy: number = 1) {
            ctx.translate(tx * this.zoom + this.pan.x, ty * this.zoom + this.pan.y);
            ctx.rotate(rotate);
            ctx.scale(sx * this.zoom, sy * this.zoom);
        }

        saveData(): any {
            return {
                type: "PanZoom",
                pan: {
                    x: this.pan.x,
                    y: this.pan.y
                },
                zoom: this.zoom
            };
        }

        loadData(obj: any) {
            Helper.assert(obj.type === "PanZoom");
            this.reset();
            Helper.extend(this, obj);
        }
    }
    export
    var g_panZoom: PanZoom = new PanZoom();
}
