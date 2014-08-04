// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {

    //------------------------------
    export class Editor {
        private hasRequestToolDraw: boolean = false;
        toolLayer: ToolLayer = new ToolLayer();
        tool: Tool = null;
        toolGroup: Tool[] = [];
        pages: Page[] = [new Page(), new Page(), new Page()];

        private _pageNumber = 0;
        get pageNumber(): number {
            return this._pageNumber;
        }
        set pageNumber(val: number) {
            var oldPage = this.page;
            if (oldPage) {
                oldPage.hide();
            }

            this._pageNumber = val;

            var page = this.pages[val];
            this.toolLayer.page = page;
            page.show();
        }
        get page(): Page {
            return this.pages[this._pageNumber];
        }


        get selectChanged(): Helper.Callback < (objects: any[]) => void > {
            return this.toolLayer.selectList.selectChanged;
        }

        constructor(public parentElem: HTMLElement, public width: number, public height: number) {
            this.reset();
        }

        reset() {
            while (this.parentElem.lastChild)
                this.parentElem.removeChild(this.parentElem.lastChild);

            for (var i = 0; i < this.pages.length; ++i) {
                var page = this.pages[i];
                page.reset();
                page.setRootElem(this.parentElem, this.width, this.height);

                var layer = new Layer();
                page.addLayer(layer);
            }

            this.toolLayer.destroyCanvas(this.parentElem);
            this.toolLayer.reset();
            this.toolLayer.createCanvas(this.parentElem, this.width, this.height);

            this.toolGroup.length = 0;
            this.tool = null;
            this.pageNumber = 0;

            this.requestToolDraw();
        }

        refresh() {

        }

        setTool(toolName: string) {
            var toolLayer = this.toolLayer;
            switch (toolName) {
                case "selectTool":
                    this.toolGroup = [new TextTool(toolLayer), new ResizeTool(toolLayer), new SelectTool(toolLayer)];
                    break;

                case "resizeTool":
                    this.toolGroup = [new TextTool(toolLayer), new ResizeTool(toolLayer), new SelectTool(toolLayer)];
                    break;

                case "moveTool":
                    this.toolGroup = [new TextTool(toolLayer), new MoveTool(toolLayer), new SelectTool(toolLayer)];
                    break;

                case "rectTool":
                    this.toolGroup = [new RectTool(toolLayer)];
                    break;

                case "ellipseTool":
                    this.toolGroup = [new EllipseTool(toolLayer)];
                    break;

                case "rotateTool":
                    this.toolGroup = [new TextTool(toolLayer), new RotateTool(toolLayer), new SelectTool(toolLayer)];
                    break;

                case "panZoomTool":
                    this.toolGroup = [new TextTool(toolLayer), new ResizeTool(toolLayer), new PanZoomTool(toolLayer)];
                    break;

                case "textTool":
                    this.toolGroup = [new TextTool(toolLayer), new ResizeTool(toolLayer), new SelectTool(toolLayer)];
                    break;
            }
        }

        onPointer(e) {
            var panZoom = this.page.panZoom;

            panZoom.x = e.x;
            panZoom.y = e.y;
            panZoom.deltaX = e.deltaX;
            panZoom.deltaY = e.deltaY;
            panZoom.pinchDistance = e.pinchDistance;

            e.x = panZoom.toX(e.x);
            e.y = panZoom.toY(e.y);
            e.deltaX = panZoom.toW(e.deltaX);
            e.deltaY = panZoom.toH(e.deltaY);
            e.pinchDistance *= panZoom.zoom;

            var tool = this.tool;
            if (tool && tool.isUsing) {
                var isUsing = tool.onPointer(e);
                this.requestToolDraw();
                if (!isUsing)
                    tool = null; // this input can be used by other tools
            } else {
                tool = null;
            }

            for (var i: number = 0; tool === null && i < this.toolGroup.length; ++i) {
                if (this.toolGroup[i].onPointer(e)) {
                    tool = this.toolGroup[i];
                    this.requestToolDraw();
                }
            }

            this.tool = tool;
        }

        draw() {
            this.page.draw();
        }

        requestToolDraw() {
            if (this.hasRequestToolDraw)
                return;
            this.hasRequestToolDraw = true;

            var self = this;
            requestAnimationFrame(function() {
                self.toolLayer.draw();
                if (self.tool !== null)
                    self.tool.draw(self.toolLayer.ctx);

                self.hasRequestToolDraw = false;
            });
        }

        undo() {
            this.toolLayer.undo();
        }

        redo() {
            this.toolLayer.redo();
        }

        saveData(): any {
            var obj = {
                type: "editor",
                pages: []
            };

            for (var i = 0; i < this.pages.length; ++i) {
                obj.pages[i] = this.pages[i].saveData();
            }

            return obj;
        }

        loadData(obj: any) {
            Helper.assert(obj.type === "editor");
            this.reset();

            this.pages.length = 0;
            for (var i = 0; i < obj.pages.length; ++i) {
                var page = new Page();
                page.loadData(obj.pages[i]);
                this.pages[i] = page;
            }

            this.pageNumber = 0;
        }
    }
}
