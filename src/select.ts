// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {

    //------------------------------
    export class SelectList {
        selectedShapes: Shape[] = [];
        selectGroup: GroupShape = new GroupShape("Select");

        constructor() {}

        reset() {
            this.selectedShapes.length = 0;
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

        // deletes all of the selected shapes
        deleteSelected() {
            // loop backwards because removeShape will alter the selectedShapes list
            for (var i: number = this.selectedShapes.length - 1; i >= 0; --i) {
                g_shapeList.removeShape(this.selectedShapes[i]);
            }
            this.selectedShapes.length = 0;

            this.rebuildSelectGroup();
        }

        showSelected() {
            g_shapeList.showShapes(this.selectedShapes);
        }

        hideSelected() {
            g_shapeList.hideShapes(this.selectedShapes);
        }

        // duplicates all of the selected shapes
        duplicateSelected(): Shape[] {
            var copyShapes: Shape[] = [];
            for (var i: number = 0; i < this.selectedShapes.length; ++i) {
                var copyShape: Shape = g_shapeList.duplicateShape(this.selectedShapes[i]);
                copyShape.transform.tx += 20;
                copyShape.calculateBounds();
                copyShapes.push(copyShape);
            }

            this.rebuildSelectGroup();
            return copyShapes;
        }

        draw(ctx) {
            this.selectGroup.drawSelect(ctx);
        }

        rebuildSelectGroup() {
            this.selectGroup.reset();
            this.selectGroup.setShapes(this.selectedShapes);

            g_draw(this);

            if (this.selectedShapes.length > 0)
                g_propertyPanel.setObjects(this.selectedShapes, this.onPropertyChanged.bind(this));
            else
                g_propertyPanel.setObjects([], null);
        }

        onPropertyChanged() {
            g_draw(g_shapeList);
        }
    }

    export
    var g_selectList: SelectList = new SelectList();
}
