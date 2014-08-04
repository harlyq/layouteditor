// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {

    //------------------------------
    export class Page {
        layers: Layer[] = [];
        width = 0;
        height = 0;
        parentElem: HTMLElement = null;
        panZoom = new PanZoom();

        private requestDrawList: Layer[] = [];

        constructor() {}

        setRootElem(parentElem: HTMLElement, width: number, height: number) {
            this.parentElem = parentElem;
            this.width = width;
            this.height = height;

            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].createCanvas(parentElem, this.width, this.height);
        }

        reset() {
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].destroyCanvas(this.parentElem);

            this.layers.length = 0;
            this.panZoom.reset();
        }

        refresh() {
            // do nothing
        }

        hide() {
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].hide();
        }

        show() {
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].show();

            this.requestDraw();
        }

        requestDraw(layer: Layer = null) {
            var index = this.requestDrawList.indexOf(layer);
            if (index !== -1)
                return; // already in the list

            this.requestDrawList.push(layer);
            if (this.requestDrawList.length !== 1)
                return; // requestAnimationFrame already in place

            var self = this;
            requestAnimationFrame(function() {
                for (var i = 0; i < self.requestDrawList.length; ++i) {
                    self.draw(self.requestDrawList[i]);
                }
                self.requestDrawList.length = 0;
            });
        }

        draw(layer: Layer = null) {
            if (layer === null) {
                for (var i = 0; i < this.layers.length; ++i)
                    this.layers[i].draw(this.panZoom);
            } else {
                layer.draw(this.panZoom);
            }
        }

        addLayer(layer: Layer) {
            this.layers.push(layer);
            layer.createCanvas(this.parentElem, this.width, this.height);
        }

        removeLayer(layer: Layer) {
            var index = this.layers.indexOf(layer);
            if (index !== -1) {
                this.layers[index].destroyCanvas(this.parentElem);
                this.layers.splice(index, 1);
            }
        }

        isValidShapeName(shapeName: string): boolean {
            for (var j = 0; j < this.layers.length; ++j) {
                var layer = this.layers[j];

                for (var i = 0; i < layer.shapes.length; ++i) {
                    if (layer.shapes[i].name === shapeName)
                        return false;
                }
            }
            return true;
        }

        saveData(): any {
            var obj = {
                type: "page",
                panZoom: this.panZoom.saveData(),
                layers: []
            };
            for (var i = 0; i < this.layers.length; ++i) {
                obj.layers.push(this.layers[i].saveData());
            }
            return obj;
        }

        loadData(obj: any) {
            Helper.assert(obj.type === "page");

            this.reset();
            this.panZoom.loadData(obj.panZoom);

            for (var i = 0; i < obj.layers.length; ++i) {
                var layerSave = obj.layers[i];
                var newLayer: Layer = new Layer();
                newLayer.loadData(layerSave);
                this.addLayer(newLayer);
            }
        }
    }
}
