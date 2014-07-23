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
        snappedX: number;
        snappedY: number;

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

        snapX(x: number): number {
            if (this.snapToGrid) {
                x = x % this.gridSize;
            } else if (this.snapToShape) {
                var i = Helper.getIndexOfSorted(this.xTabs, x);
                i = this.getClosestIndex(this.xTabs, x, i);
                if (Math.abs(this.xTabs[i] - x) < this.shapeGravity) {
                    x = this.xTabs[i];
                    this.snappedX = x;
                } else {
                    this.snappedX = undefined;
                }
            }

            return x;
        }

        snapY(y: number): number {
            if (this.snapToGrid) {
                y = y % this.gridSize;
            } else if (this.snapToShape) {
                var j = Helper.getIndexOfSorted(this.yTabs, y);
                j = this.getClosestIndex(this.yTabs, y, j);
                if (Math.abs(this.yTabs[j] - y) < this.shapeGravity) {
                    y = this.yTabs[j];
                    this.snappedY = y;
                } else {
                    this.snappedY = undefined;
                }
            }

            return y;
        }

        snapXY(x: number, y: number): XY {
            return {
                x: this.snapX(x),
                y: this.snapY(y)
            };
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
        }

        draw(ctx) {
            if (this.snappedX !== undefined || this.snappedY !== undefined) {
                ctx.save();
                g_panZoom.transform(ctx);

                ctx.beginPath();
                g_snapStyle.draw(ctx);

                if (this.snappedX !== undefined) {
                    ctx.moveTo(this.snappedX, 0);
                    ctx.lineTo(this.snappedX, 1000);
                }
                if (this.snappedY !== undefined) {
                    ctx.moveTo(0, this.snappedY);
                    ctx.lineTo(1000, this.snappedY);
                }

                ctx.restore();
                ctx.stroke();
            }


            // ctx.save();
            // g_panZoom.transform(ctx);
            // ctx.beginPath();
            // for (var i = 0; i < this.xTabs.length; ++i) {
            //     ctx.moveTo(this.xTabs[i], 0);
            //     ctx.lineTo(this.xTabs[i], 1000);
            // }
            // for (var i = 0; i < this.yTabs.length; ++i) {
            //     ctx.moveTo(0, this.yTabs[i]);
            //     ctx.lineTo(1000, this.yTabs[i]);
            // }
            // ctx.stroke();
            // ctx.restore();
        }
    }
    export
    var g_grid: Grid = new Grid();

}
