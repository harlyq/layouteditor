// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {
    "use strict";

    export class StylePanel {
        private canvas = null;
        private ctx = null;
        private rootElem: HTMLElement = null;
        private styleShape: RectShape = new RectShape(80, 60);
        private selected: HTMLElement = null;
        private elems: {
            [key: string]: HTMLElement
        } = {};

        constructor() {
            this.styleShape.text = "Text"
        }

        setRootElem(elem: HTMLElement) {
            this.rootElem = elem;

            var self = this;
            elem.addEventListener("click", function(e) {
                self.onClick(e)
            });

            this.buildHTML();
        }

        private onClick(e) {
            var xStyleButton = this.getXStyleButton(e.target);
            if (xStyleButton)
                this.selectStyle(xStyleButton.getAttribute("value"));
        }

        private getXStyleButton(target) {
            while (target && target.nodeName !== 'X-STYLEBUTTON')
                target = target.parentNode;

            return target;
        }

        reset() {
            this.buildHTML();
        }

        refresh() {
            // do nothing
        }

        onPropertyChanged() {
            ( < any > this.selected).refresh();
        }

        selectStyle(styleName: string) {
            if (this.selected)
                this.selected.classList.remove('selectedStyle');

            this.selected = this.elems[styleName];
            if (this.selected) {
                this.selected.classList.add('selectedStyle')
                g_propertyPanel.setObject(g_styleList.getStyle(styleName), this.onPropertyChanged.bind(this));
            }
        }

        private buildHTML() {
            this.selected = null;

            while (this.rootElem.lastChild)
                this.rootElem.removeChild(this.rootElem.lastChild);

            for (var i: number = 0; i < g_styleList.styles.length; ++i) {
                var newElem = document.createElement('x-styleButton');
                var name = g_styleList.styles[i].name;

                newElem.setAttribute('value', name);

                this.rootElem.appendChild(newElem);
                this.elems[name] = newElem;
            }

            if (g_styleList.styles.length > 0)
                this.selectStyle(g_styleList.styles[0].name);
        }
    }

    class XStyleButtonInternal {
        private canvas = null;
        private ctx = null;
        private width: number = 80;
        private height: number = 60;
        private rectShape = new RectShape(this.width - 20, this.height - 20);
        private labelElem: HTMLElement = null;

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

            this.refresh();
        }

        public attributeChanged(attrName, oldVal, newVal) {
            this.refresh();
        }

        private refresh() {
            var styleName = this.elem.getAttribute("value");
            var style: Style = g_styleList.getStyle(styleName);
            var ctx = this.ctx;

            if (style !== null)
                this.rectShape.setStyle(style);

            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.rectShape.draw(ctx, g_noPanZoom);

            this.labelElem.innerHTML = styleName;
        }
    }

    export
    var XStyleButton = Object.create(HTMLElement.prototype);

    XStyleButton.createdCallback = function() {
        this.internal = new XStyleButtonInternal(this);
    }

    XStyleButton.attributeChangedCallback = function(attrName, oldVal, newVal) {
        this.internal.attributeChanged(attrName, oldVal, newVal);
    }

    XStyleButton.refresh = function() {
        this.internal.refresh();
    }

    var altDocument: any = document;
    altDocument.registerElement("x-styleButton", {
        prototype: XStyleButton
    });

    export
    var g_stylePanel: StylePanel = new StylePanel();
}