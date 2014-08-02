// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {

    //------------------------------
    export class ToolLayer extends Layer {
        screen = new Screen();
        selectList = new SelectList();
        grid = new Grid();
        commandList = new CommandList();
        style = null;
        page = null;

        private hasRequestDraw = false;
        private _layer: Layer = null;
        get layer(): Layer {
            return this._layer;
        }
        set layer(val: Layer) {
            this._layer = val;
            this.selectList.layer = val;
        }

        constructor() {
            super();

            var self = this;
            this.screen.screenChanged.add(function(screenType: ScreenType) {
                self.draw();
            });
        }

        reset() {
            //this.screen.reset();
            this.selectList.reset();
            //this.grid.reset();
            this.commandList.reset();
            //this.style.reset();

            this.style = g_styleList.styles[0]; // HACK
        }

        draw() {
            var panZoom = this.page.panZoom;
            super.draw(panZoom); // must be first, clears the ctx

            var ctx = this.ctx;
            this.screen.draw(ctx, panZoom);
            this.grid.draw(ctx, panZoom);
            this.selectList.draw(ctx, panZoom);
            this.hasRequestDraw = false;
        }

        undo() {
            this.commandList.undo();
        }

        redo() {
            this.commandList.redo();
        }

        requestDraw() {
            if (this.hasRequestDraw)
                return;
            this.hasRequestDraw = true;

            requestAnimationFrame(this.draw.bind(this));
        }

        moveSelectToToolLayer() {
            this.addShapes(this.selectList.selectedShapes);
            this.page.requestDraw(this._layer);
        }

        moveSelectToLayer() {
            this._layer.addShapes(this.selectList.selectedShapes);
            this.page.requestDraw(this._layer);
        }

        createCanvas(parentElem: HTMLElement, width: number, height: number) {
            super.createCanvas(parentElem, width, height);
            this.canvas.style.zIndex = "1000"; // tool layer always on top
        }
    }
}
