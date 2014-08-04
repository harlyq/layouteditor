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

        private hasRequestDraw = false;
        private _layer: Layer = null;
        get layer(): Layer {
            return this._layer;
        }
        set layer(val: Layer) {
            this._layer = val;
            this.selectList.layer = val;
        }

        private _page: Page = null;
        get page(): Page {
            return this._page;
        }
        set page(page: Page) {
            this._page = page;
            this.selectList.reset();

            if (page.layers.length > 0)
                this.layer = page.layers[0];
            else
                this.layer = null;
            this.requestDraw();
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
            this.requestDraw();
        }

        draw() {
            Helper.assert(this.page !== null);

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
            this.selectList.refresh(); // in case a selected shape was changed
            this.requestDraw();
        }

        redo() {
            this.commandList.redo();
            this.selectList.refresh(); // in case a selected shape was changed
            this.requestDraw();
        }

        requestDraw() {
            if (this.hasRequestDraw)
                return;
            this.hasRequestDraw = true;

            requestAnimationFrame(this.draw.bind(this));
        }

        duplicateSelect() {
            var command = new DuplicateShapesCommand(this.page, this.layer, this.selectList.selectedShapes);
            this.commandList.addCommand(command);
            this.selectList.setSelectedShapes(command.duplicatedShapes);
            this.requestDraw();
        }

        deleteSelect() {
            this.commandList.addCommand(new DeleteShapesCommand(this.page, this.layer, this.selectList.selectedShapes));
            this.selectList.refresh();
            this.requestDraw();
        }

        distributeSelect(distribute: DistributeStyle) {
            this.commandList.addCommand(new DistributeShapesCommand(this.page, this.layer, this.selectList.selectedShapes, distribute));
            this.selectList.refresh();
            this.requestDraw();
        }

        makeSquareSelect() {
            this.commandList.addCommand(new MakeSquareShapesCommand(this.page, this.layer, this.selectList.selectedShapes));
            this.selectList.refresh();
            this.requestDraw();
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
            super.show();
        }
    }
}
