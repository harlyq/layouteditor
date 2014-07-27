/// <reference path="_dependencies.ts" />
module LayoutEditor {

    //------------------------------
    export class Style {
        name: string = "";
        strokeStyle: string = "black";
        fillStyle: string = "none";
        lineWidth: number = 1;
        lineDash: number[] = [];
        textAlign: string = "center";
        textBaseline: string = "middle";
        fontSize: number = 20;
        fontFamily: string = "arial";
        fontWeight: string = "normal";
        fontStyle: string = "black";
        fontSpacing: number = 1;

        static uniqueID: number = 1;

        constructor(name ? : string) {
            if (typeof name === "undefined")
                this.name = "Style" + Style.uniqueID++;
            else
                this.name = name;
        }

        draw(ctx) {
            if (ctx.strokeStyle !== this.strokeStyle)
                ctx.strokeStyle = this.strokeStyle;
            if (ctx.fillStyle !== this.fillStyle)
                ctx.fillStyle = this.fillStyle;
            if (ctx.lineWidth !== this.lineWidth.toString())
                ctx.lineWidth = this.lineWidth.toString();
            ctx.setLineDash(this.lineDash);
            if (ctx.textAlign !== this.textAlign)
                ctx.textAlign = this.textAlign;
            if (ctx.textBaseline !== this.textBaseline)
                ctx.textBaseline = this.textBaseline;
            var font = this.fontWeight + " " + this.fontSize + "px " + this.fontFamily;
            if (ctx.font !== font)
                ctx.font = font;
        }

        saveData(): any {
            return Helper.extend({}, this);
        }

        loadData(obj: any) {
            Helper.extend(this, obj);
        }
    }
    export
    var g_drawStyle: Style = new Style("draw");
    export
    var g_selectStyle: Style = new Style("select");
    export
    var g_snapStyle: Style = new Style("snap");

    g_drawStyle.strokeStyle = "red";
    g_drawStyle.lineDash = [2, 2];
    g_selectStyle.strokeStyle = "blue";
    g_selectStyle.lineDash = [5, 5];
    g_selectStyle.fontStyle = "blue";
    g_snapStyle.strokeStyle = "red";

    export
    var g_style: Style = null;

    export class StyleList {
        styles: Style[] = [];

        constructor() {
            this.reset();
        }

        reset() {
            this.styles.length = 0;

            var defaultStyle = new Style("default");
            defaultStyle.fillStyle = "white";

            this.styles.push(defaultStyle);
            g_style = defaultStyle;
        }

        getStyle(name: string): Style {
            for (var i: number = 0; i < this.styles.length; ++i) {
                var style: Style = this.styles[i];
                if (style.name === name)
                    return style;
            }

            return null;
        }

        duplicateStyle(style: Style): Style {
            var newStyle: Style = new Style();
            Helper.extend(newStyle, style);
            this.styles.push(newStyle);

            return newStyle;
        }

        removeStyle(style: Style): boolean {
            var index: number = this.styles.indexOf(style);
            if (index !== -1)
                this.styles.splice(index, 1);
            return index !== -1;
        }

        saveData(): any {
            var obj = {
                styles: []
            };

            for (var i = 0; i < this.styles.length; ++i) {
                obj.styles.push(this.styles[i].saveData());
            }

            return obj;
        }

        loadData(obj: any) {
            this.reset();
            this.styles.length = 0; // we will load the default style

            for (var i = 0; i < obj.styles.length; ++i) {
                var style = new Style();
                style.loadData(obj.styles[i]);
                this.styles.push(style);
            }

            g_style = this.getStyle("default");
        }

        getReferenceList(): ReferenceItem[] {
            var items: ReferenceItem[];
            for (var i: number = 0; i < this.styles.length; i++) {
                var style: Style = this.styles[i];
                items.push({
                    object: style,
                    name: style.name
                });
            }
            return items;
        }
    }

    export
    var g_styleList = new StyleList();


    g_propertyPanel.addPropertyList({
        canHandle: (obj: any) => {
            return obj instanceof Style;
        },
        items: [{
            prop: "strokeStyle"
        }, {
            prop: "fillStyle"
        }, {
            prop: "lineWidth"
        }, {
            prop: "textAlign"
        }, {
            prop: "textBaseline"
        }, {
            prop: "fontSize"
        }, {
            prop: "fontFamily"
        }, {
            prop: "fontWeight"
        }, {
            prop: "fontStyle"
        }, {
            prop: "fontSpacing"
        }]
    });

}
