// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {

    export enum StyleTextAlign {
        center, left, right
    }

    export enum StyleTextBaseline {
        top, middle, bottom
    }

    export enum StyleFontWeight {
        normal, bold, bolder, lighter
    }

    export enum StyleFontStyle {
        normal, italic, oblique
    }

    //------------------------------
    export class Style {
        name: string = "";
        strokeColor: string = "black";
        fillColor: string = "none";
        lineWidth: number = 1;
        lineDash: number[] = [];
        textAlign: StyleTextAlign = StyleTextAlign.center;
        textBaseline: StyleTextBaseline = StyleTextBaseline.middle;
        fontSize: number = 20;
        fontFamily: string = "arial";
        fontWeight: StyleFontWeight = StyleFontWeight.normal;
        fontStyle: StyleFontStyle = StyleFontStyle.normal;
        fontColor: string = "black"
        fontSpacing: number = 1;
        id: number = 0;

        static uniqueID: number = 1;

        constructor(name ? : string) {
            this.id = Style.uniqueID++;
            if (typeof name === "undefined")
                this.name = "Style" + this.id;
            else
                this.name = name;
        }

        drawShape(ctx) {
            if (ctx.strokeStyle !== this.strokeColor)
                ctx.strokeStyle = this.strokeColor;
            if (ctx.fillStyle !== this.fillColor)
                ctx.fillStyle = this.fillColor;
            if (ctx.lineWidth !== this.lineWidth.toString())
                ctx.lineWidth = this.lineWidth.toString();
            ctx.setLineDash(this.lineDash);
        }

        drawFont(ctx) {
            var textAlign: string = StyleTextAlign[this.textAlign];
            if (ctx.textAlign !== textAlign)
                ctx.textAlign = textAlign;

            var textBaseline: string = StyleTextBaseline[this.textBaseline];
            if (ctx.textBaseline !== textBaseline)
                ctx.textBaseline = textBaseline;

            if (ctx.fillStyle !== this.fontColor)
                ctx.fillStyle = this.fontColor;

            var font = StyleFontWeight[this.fontWeight] + " " + StyleFontStyle[this.fontStyle] + ' ' +
                this.fontSize + "px " + this.fontFamily;
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
    var g_drawStyle: Style = new Style("_draw");
    g_drawStyle.strokeColor = "red";
    g_drawStyle.lineDash = [2, 2];

    export
    var g_selectStyle: Style = new Style("_select");
    g_selectStyle.strokeColor = "blue";
    g_selectStyle.lineDash = [5, 5];
    g_selectStyle.fontColor = "blue";

    export
    var g_snapStyle: Style = new Style("_snap");
    g_snapStyle.strokeColor = "red";

    export
    var g_style: Style = null;

    export class StyleList {
        styles: Style[] = [];

        constructor() {}

        shutdown() {
            g_style = null;
            this.styles.length = 0;
        }

        startup() {
            g_style = this.styles[0];
        }

        newGame() {
            var defaultStyle = new Style("default");
            defaultStyle.fillColor = "white";

            var defaultStyle2 = new Style("default2");
            defaultStyle2.fillColor = "none";
            defaultStyle2.lineWidth = 2;
            defaultStyle2.strokeColor = "green";
            defaultStyle2.textAlign = StyleTextAlign.left;
            defaultStyle2.fontSize = 15;
            defaultStyle2.fontColor = "green";

            this.styles.push(defaultStyle);
            this.styles.push(defaultStyle2);
        }

        getStyle(id: number): Style {
            for (var i: number = 0; i < this.styles.length; ++i) {
                var style: Style = this.styles[i];
                if (style.id === id)
                    return style;
            }

            return null;
        }

        duplicateStyle(style: Style): Style {
            var newStyle: Style = new Style();
            var styleName: string = newStyle.name;

            Helper.extend(newStyle, style);
            newStyle.name = styleName;

            this.styles.push(newStyle);

            return newStyle;
        }

        addStyle(newStyle: Style) {
            this.styles.push(newStyle);
        }

        removeStyle(style: Style): boolean {
            var index: number = this.styles.indexOf(style);
            if (index !== -1)
                this.styles.splice(index, 1);
            return index !== -1;
        }

        isValidStyleName(styleName: string): boolean {
            for (var i: number = 0; i < this.styles.length; ++i) {
                if (this.styles[i].name === styleName)
                    return false;
            }
            return true;
        }

        saveData(): any {
            var obj = {
                type: "StyleList",
                styles: []
            };

            for (var i = 0; i < this.styles.length; ++i) {
                obj.styles.push(this.styles[i].saveData());
            }

            return obj;
        }

        loadData(obj: any) {
            Helper.assert(obj.type === "StyleList");

            var style = null;
            for (var i = 0; i < obj.styles.length; ++i) {
                style = new Style();
                style.loadData(obj.styles[i]);
                this.styles.push(style);
            }
        }

        getList(): ReferenceItem[] {
            var items: ReferenceItem[] = [];
            for (var i: number = 0; i < this.styles.length; i++) {
                var style: Style = this.styles[i];
                items.push({
                    value: style,
                    name: style.name
                });
            }
            return items;
        }
    }

    var styleDefinition = new EditorDefinition();
    styleDefinition.canHandle = function(obj: any) {
        return obj instanceof Style;
    };
    styleDefinition.items = [{
        prop: 'name',
        match: '^[a-zA-Z]\\w*$',
        // allowMultiple: false,
        // isValid: function(value) {
        //     return g_styleList.isValidStyleName(value);
        // }
    }, {
        prop: "strokeColor",
        match: '^[a-zA-Z]*$|^#[A-Fa-f0-9]*$'
    }, {
        prop: "fillColor",
        match: '^[a-zA-Z]*$|^#[A-Fa-f0-9]*$'
    }, {
        prop: "lineWidth",
        match: '^\\d+$'
    }, {
        prop: "textAlign",
        type: 'list',
        getList: () => {
            return Helper.enumList(StyleTextAlign);
        }
    }, {
        prop: "textBaseline",
        type: 'list',
        getList: () => {
            return Helper.enumList(StyleTextBaseline);
        }
    }, {
        prop: "fontSize",
        match: '^\\d+$'
    }, {
        prop: "fontFamily",
        match: '^[a-zA-Z]*$'
    }, {
        prop: "fontWeight",
        type: 'list',
        getList: () => {
            return Helper.enumList(StyleFontWeight);
        }
    }, {
        prop: "fontStyle",
        type: 'list',
        getList: () => {
            return Helper.enumList(StyleFontStyle);
        }
    }, {
        prop: "fontColor",
        match: '^[a-zA-Z]*$|^#[A-Fa-f0-9]*$'
    }, {
        prop: 'fontSpacing'
    }];

    g_propertyList.addEditorDefintion(styleDefinition);

    export
    var g_styleList = new StyleList();
}
