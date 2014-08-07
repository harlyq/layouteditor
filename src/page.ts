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

        setup(parentElem: HTMLElement, width: number, height: number) {
            this.parentElem = parentElem;
            this.width = width;
            this.height = height;
        }

        shutdown() {
            for (var i = this.layers.length - 1; i >= 0; --i)
                this.layers[i].shutdown();

            this.layers.length = 0;
        }

        startup() {
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].startup();

            this.panZoom.reset();
        }

        newGame() {
            var newLayer = new Layer();
            newLayer.setup(this.parentElem, this.width, this.height);
            this.layers.push(newLayer);
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
        }

        removeLayer(layer: Layer) {
            var index = this.layers.indexOf(layer);
            if (index !== -1) {
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

            this.panZoom.loadData(obj.panZoom);

            for (var i = 0; i < obj.layers.length; ++i) {
                var layerSave = obj.layers[i];
                var newLayer: Layer = new Layer();
                newLayer.setup(this.parentElem, this.width, this.height);

                newLayer.loadData(layerSave);
                this.addLayer(newLayer);
            }
        }
    }

    //-------------------------------
    export class PageList {
        pages: Page[] = [];
        parentElem: HTMLElement = null;
        width: number = 0;
        height: number = 0;

        constructor() {}

        setup(parentElem: HTMLElement, width: number, height: number) {
            this.parentElem = parentElem;
            this.width = width;
            this.height = height;

            this.startup();
        }

        shutdown() {
            for (var i = this.pages.length - 1; i >= 0; --i)
                this.pages[i].shutdown();

            this.pages.length = 0;
        }

        startup() {
            for (var i = 0; i < this.pages.length; ++i)
                this.pages[i].startup();
        }

        newGame() {
            for (var i = 0; i < 3; ++i) {
                var page = new Page();
                page.setup(this.parentElem, this.width, this.height);
                page.newGame();
                this.addPage(page);
            }
        }

        addPage(page: Page) {
            page.setup(this.parentElem, this.width, this.height);
            this.pages.push(page)
        }

        removePage(page: Page) {
            // TODO need to do something about the page canvases

            var index = this.pages.indexOf(page);
            if (index !== -1) {
                this.pages.splice(index);
            }
        }

        getPage(index: number): Page {
            return this.pages[index];
        }

        saveData(): any {
            var obj = {
                type: "PageList",
                pages: []
            };

            for (var i = 0; i < this.pages.length; ++i) {
                obj.pages[i] = this.pages[i].saveData();
            }

            return obj;
        }

        loadData(obj: any) {
            Helper.assert(obj.type === "PageList");

            this.pages.length = 0;
            for (var i = 0; i < obj.pages.length; ++i) {
                var page = new Page();
                page.setup(this.parentElem, this.width, this.height);

                page.loadData(obj.pages[i]);
                this.pages[i] = page;
            }
        }
    }
}
