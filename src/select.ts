// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {

    //------------------------------
    export class SelectList {
        selectedShapes: Shape[] = [];
        selectGroup: GroupShape = new GroupShape("Select");
        layer: Layer = null;
        selectChanged = new Helper.Callback < (objects: any[]) => void > ();

        constructor() {}

        setLayer(layer: Layer) {
            if (layer == this.layer)
                return;

            this.layer = layer;
            this.selectGroup.setShapes([]);
        }

        refresh() {
            this.rebuildSelectGroup();
        }

        reset() {
            this.selectedShapes.length = 0;
            this.selectGroup.reset();
        }

        // removes the shape from the selected list
        removeSelected(shape: Shape) {
            var index: number = this.selectedShapes.indexOf(shape);
            if (index !== -1) {
                this.selectedShapes.splice(index, 1);
                this.rebuildSelectGroup();
            }
        }

        toggleSelected(shapes: Shape[]) {
            for (var i: number = 0; i < shapes.length; ++i) {
                var shape: Shape = shapes[i];
                var index: number = this.selectedShapes.indexOf(shape);
                if (index === -1)
                    this.selectedShapes.push(shape);
                else
                    this.selectedShapes.splice(index, 1);
            }
            this.rebuildSelectGroup();
        }

        isSelected(shape: Shape): boolean {
            return this.selectedShapes.indexOf(shape) !== -1;
        }

        setSelectedShapes(shapes: Shape[]) {
            this.selectedShapes = shapes.slice(); // copy
            this.rebuildSelectGroup();
        }

        // returns the instance
        getSelectedShapes(): Shape[] {
            return this.selectedShapes;
        }

        clearSelectedShapes() {
            this.selectedShapes.length = 0;
            this.rebuildSelectGroup();
        }

        draw(ctx, panZoom: PanZoom) {
            this.selectGroup.drawSelect(ctx, panZoom);
        }

        rebuildSelectGroup() {
            this.selectGroup.reset();
            this.selectGroup.setShapes(this.selectedShapes);
            this.selectChanged.fire(this.selectGroup.enclosedShapes);
        }
    }
}
