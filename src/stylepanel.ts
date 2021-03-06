// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {
    "use strict";

    export class StylePanel {
        private canvas = null;
        private ctx = null;
        private addButton: HTMLElement = null;
        private selected: Style[] = [];
        private elems: {
            [key: number]: HTMLElement
        } = {};

        selectChanged = new Helper.Callback();

        constructor(private rootElem: HTMLElement, private styleList: StyleList) {
            var self = this;
            rootElem.addEventListener("click", function(e) {
                self.onClick(e)
            });
        }

        private onClick(e) {
            var xStyleButton = this.getXStyleButton(e.target);
            if (xStyleButton)
                this.selectStyle(parseInt(xStyleButton.getAttribute("value")));
        }

        private getXStyleButton(target) {
            while (target && target.nodeName !== 'X-STYLEBUTTON')
                target = target.parentNode;

            return target;
        }

        shutdown() {
            this.selected = [];
            this.elems = {};

            while (this.rootElem.lastChild)
                this.rootElem.removeChild(this.rootElem.lastChild);
        }

        startup() {
            this.buildHTML();
        }

        draw() {
            for (var styleID in this.elems) {
                ( < any > this.elems[styleID]).refresh();
            }
        }

        selectStyle(styleID: number) {
            var styleElem = this.elems[styleID];
            if (styleElem) {
                var style = this.styleList.getStyle(styleID);
                var index = this.selected.indexOf(style);

                if (index === -1) {
                    this.selected.push(style);
                    styleElem.classList.add("selectedStyle");
                } else {
                    this.selected.splice(index, 1);
                    styleElem.classList.remove("selectedStyle");
                }

                this.selectChanged.fire(this.selected);
            }
        }

        private buildHTML() {
            this.addButton = document.createElement('div');
            this.addButton.classList.add('StylePanelAddButton');
            this.addButton.addEventListener("click", this.onAddStyle.bind(this));
            this.addButton.innerHTML = "+";
            this.rootElem.appendChild(this.addButton);

            for (var i: number = 0; i < this.styleList.styles.length; ++i) {
                var newElem = document.createElement('x-styleButton');
                var id = this.styleList.styles[i].id;

                ( < any > newElem).setStyleList(this.styleList);
                newElem.setAttribute('value', id.toString());

                this.rootElem.appendChild(newElem);
                this.elems[id] = newElem;
            }
        }

        private onAddStyle() {
            var newStyle: Style = new Style();
            this.styleList.addStyle(newStyle);
            this.buildHTML();
            this.selectStyle(newStyle.id);
        }
    }

    class XStyleButtonInternal {
        private canvas = null;
        private ctx = null;
        private width: number = 80;
        private height: number = 60;
        private rectShape = new RectShape("_Thumb", this.width - 20, this.height - 20);
        private labelElem: HTMLElement = null;
        private styleList: StyleList = null;

        constructor(private elem) {
            var shadow = elem.createShadowRoot();

            shadow.innerHTML = '<style>.label {text-align: center; font: bold 12px courier}</style>' +
                '<canvas></canvas><div class="label"></div></div>';

            this.rectShape.text = "Text";
            this.rectShape.transform.translate(this.width * 0.5, this.height * 0.5);
            this.rectShape.calculateBounds();

            this.canvas = shadow.querySelector("canvas");
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.ctx = this.canvas.getContext("2d");
            this.labelElem = shadow.querySelector(".label");
        }

        private refresh() {
            var id: number = parseInt(this.elem.getAttribute("value"));
            var style: Style = this.styleList.getStyle(id);
            var ctx = this.ctx;

            if (style === null)
                style = this.styleList.styles[0]; // HACK

            this.rectShape.style = style;
            this.labelElem.innerHTML = style.name;

            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.rectShape.draw(ctx, PanZoom.none);
        }
    }

    export
    var XStyleButton = Object.create(HTMLElement.prototype);

    XStyleButton.createdCallback = function() {
        this.internal = new XStyleButtonInternal(this);
    }

    XStyleButton.attributeChangedCallback = function(attrName, oldVal, newVal) {
        if (this.parentNode)
            this.internal.refresh();
    }

    XStyleButton.attachedCallback = function() {
        this.internal.refresh();
    }

    XStyleButton.refresh = function() {
        this.internal.refresh();
    }

    XStyleButton.setStyleList = function(styleList: StyleList) {
        this.internal.styleList = styleList;
    }

    var altDocument: any = document;
    altDocument.registerElement("x-styleButton", {
        prototype: XStyleButton
    });

}
