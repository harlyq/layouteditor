// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {

    //------------------------------
    export class PanZoom {
        panX: number = 0;
        panY: number = 0;
        zoom: number = 1;

        // raw input values, prior to panZoom scaling
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
            return (x - this.panX) / this.zoom;
        }
        toY(y: number): number {
            return (y - this.panY) / this.zoom;
        }
        toH(h: number): number {
            return h / this.zoom;
        }
        toW(w: number): number {
            return w / this.zoom;
        }

        calcXY(x: number, y: number): XY {
            return {
                x: x * this.zoom + this.panX,
                y: y * this.zoom + this.panY
            };
        }

        invXY(x: number, y: number): XY {
            return {
                x: (x - this.panX) / this.zoom,
                y: (y - this.panY) / this.zoom
            };
        }

        transform(ctx, tx: number = 0, ty: number = 0, rotate: number = 0, sx: number = 1, sy: number = 1) {
            ctx.translate(tx * this.zoom + this.panX, ty * this.zoom + this.panY);
            ctx.rotate(rotate);
            ctx.scale(sx * this.zoom, sy * this.zoom);
        }

        transformComplete(ctx, t: Transform) {
            var zoom: number = this.zoom;
            ctx.transform(zoom * t.a, zoom * t.b, zoom * t.c, zoom * t.d, t.tx * zoom + this.panX, t.ty * zoom + this.panY);
        }

        saveData(): any {
            return {
                type: "PanZoom",
                panX: this.panX,
                panY: this.panY,
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
    export
    var g_noPanZoom: PanZoom = new PanZoom();
}
