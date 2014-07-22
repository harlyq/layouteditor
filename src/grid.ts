/// <reference path="_dependencies.ts" />
module LayoutEditor {

    function insertSortedUnique(list: number[], value: number) {
        var numList: number = list.length;
        if (numList === 0)
            return list.splice(0, 0, value);

        var i: number = 0;
        var j: number = numList - 1;
        var mid: number = 0;
        var midValue: number = 0;
        do {
            mid = (i + j) >> 1;
            midValue = list[mid];
            if (value === midValue)
                return; // value already in the list

            if (value < midValue) {
                j = mid - 1;
            } else {
                i = mid + 1;
            }
        } while (i <= j);

        if (value < midValue)
            list.splice(mid, 0, value);
        else
            list.splice(mid + 1, 0, value);
    }

    //------------------------------
    export class Grid {
        snapToGrid: boolean = false;
        gridSize: number = 10;
        snapToShape: boolean = true;
        xTabs: number[] = [];
        yTabs: number[] = [];
        shapeGravity: number = 10;
        snappedX: number = -1;
        snappedY: number = -1;

        constructor() {

        }

        private getClosestIndex(list: number[], value: number, index: number): number {
            var bestDist: number = Math.abs(value - list[index]);
            var bestIndex: number = index;
            var leftIndex: number = index - 1;
            var rightIndex: number = index + 1;

            if (rightIndex < list.length) {
                var dist = Math.abs(value - list[rightIndex]);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIndex = rightIndex;
                }
            }

            if (leftIndex >= 0) {
                var dist = Math.abs(value - list[leftIndex]);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIndex = leftIndex;
                }
            }

            return bestIndex;
        }

        snapXY(x: number, y: number): XY {
            var pos: XY = {
                x: x,
                y: y
            };

            if (this.snapToGrid) {
                pos.x = pos.x % this.gridSize;
                pos.y = pos.y % this.gridSize;
            } else if (this.snapToShape) {
                var i = Helper.getIndexOfSorted(this.xTabs, pos.x);
                i = this.getClosestIndex(this.xTabs, pos.x, i);
                if (Math.abs(this.xTabs[i] - pos.x) < this.shapeGravity) {
                    pos.x = this.xTabs[i];
                    this.snappedX = pos.x;
                } else {
                    this.snappedX = -1;
                }

                var j = Helper.getIndexOfSorted(this.yTabs, pos.y);
                j = this.getClosestIndex(this.yTabs, pos.y, j);
                if (Math.abs(this.yTabs[j] - pos.y) < this.shapeGravity) {
                    pos.y = this.yTabs[j];
                    this.snappedY = pos.y;
                } else {
                    this.snappedY = -1;
                }
            }

            return pos;
        }

        rebuildTabs(excludeShapes: Shape[] = []) {
            if (!this.snapToShape)
                return;

            this.xTabs.length = 0;
            this.yTabs.length = 0;

            for (var i: number = 0; i < g_shapeList.shapes.length; ++i) {
                var shape: Shape = g_shapeList.shapes[i];
                if (shape.isDeleted || excludeShapes.indexOf(shape) !== -1)
                    continue;

                var polygon: number[] = shape.aabb.toPolygon();
                var x1: number = Helper.arrayMin(polygon, 0, 2);
                var x2: number = Helper.arrayMax(polygon, 0, 2);
                var y1: number = Helper.arrayMin(polygon, 1, 2);
                var y2: number = Helper.arrayMax(polygon, 1, 2);
                var cx: number = (x1 + x2) * 0.5;
                var cy: number = (y1 + y2) * 0.5;

                insertSortedUnique(this.xTabs, x1);
                insertSortedUnique(this.xTabs, x2);
                insertSortedUnique(this.xTabs, cx);
                insertSortedUnique(this.yTabs, y1);
                insertSortedUnique(this.yTabs, y2);
                insertSortedUnique(this.yTabs, cy);
            }

            // ctx.save();
            // g_panZoom.transform(g_toolCtx);
            // g_toolCtx.beginPath();
            // for (var i = 0; i < this.xTabs.length; ++i) {
            //     g_toolCtx.moveTo(this.xTabs[i], 0);
            //     g_toolCtx.lineTo(this.xTabs[i], 1000);
            // }
            // for (var i = 0; i < this.yTabs.length; ++i) {
            //     g_toolCtx.moveTo(0, this.yTabs[i]);
            //     g_toolCtx.lineTo(1000, this.yTabs[i]);
            // }
            // g_toolCtx.stroke();
            // ctx.restore();
        }

    }
    export
    var g_grid: Grid = new Grid();

}
