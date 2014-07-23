/// <reference path="_dependencies.ts" />
module LayoutEditor {

    //------------------------------
    export interface PropertyItem {
        name: string;
        type ? : string;
        getReferenceList ? : () => LayoutEditor.ReferenceItem[];
    }

    export interface PropertyList {
        isA: (obj: any) => boolean;
        items: PropertyItem[];
    }

    export interface PropertyInfo {
        y: number;
        height: number;
        propertyItem: PropertyItem;
        object: any;
        name: string;
    }

    export class PropertyPanel {
        propertyLists: PropertyList[] = [];
        public width: number = 0;
        public nameWidth: number = 0;
        object: any = null;
        private lineHeight: number = 0;
        propertyInfos: PropertyInfo[] = [];
        fontSize: number = 12;
        fontSpacing: number = 1.1;
        fontStyle: string = "black";

        constructor(width: number = 150) {
            this.setWidth(width);
        }

        setWidth(width: number) {
            this.width = width;
            this.nameWidth = width * 0.5;
        }

        setObject(obj: any) {
            this.object = obj;
        }

        addPropertyList(propertyList: PropertyList) {
            this.propertyLists.push(propertyList);
            this.requestDraw();
        }

        getPropertyList(obj: any) {
            // loop backwards as more specific types are listed last
            for (var i: number = this.propertyLists.length - 1; i >= 0; --i) {
                if (this.propertyLists[i].isA(obj))
                    return this.propertyLists[i];
            }
        }

        // returns y position of the next property
        drawObject(ctx, object: any, name: string, x: number, y: number): number {
            if (name.length > 0) {
                ctx.fillText("+ " + name, x, y);
                y += this.lineHeight;
            }

            var propertyList: PropertyList = this.getPropertyList(object);

            for (var i: number = 0; i < propertyList.items.length; ++i) {
                var propItem: PropertyItem = propertyList.items[i];
                var name: string = propItem.name;

                var propInfo: PropertyInfo = {
                    y: y,
                    height: 0,
                    propertyItem: propItem,
                    object: object,
                    name: name
                };

                this.propertyInfos.push(propInfo);

                switch (propItem.type) {
                    case "object":
                        y = this.drawObject(ctx, object[name], name, x, y);
                        break;

                    case undefined:
                    case "":
                    case "string":
                    case "number":
                        y = this.drawText(ctx, object, name, x, y);
                }

                propInfo.height = y - propInfo.y;
            }

            return y;
        }

        drawText(ctx, object: any, name: string, x: number, y: number): number {
            ctx.fillText(name + " : " + object[name], x, y);
            return y + this.lineHeight;
        }

        editText(ctx, object: any, name: string, value: string, x: number, y: number): number {
            ctx.fillText(name + " : " + value, x, y);
            return y + this.lineHeight;
        }

        // TODO this needs to relate to how we draw properties
        drawEditing(info: PropertyInfo, value: string) {
            var x: number = g_propertyCtx.canvas.width - this.width;

            g_propertyCtx.clearRect(x, info.y, this.width, info.height);

            switch (info.propertyItem.type) {
                case "object":
                    break;

                case undefined:
                case "":
                case "string":
                case "number":
                    this.editText(g_propertyCtx, info.object, info.name, value, x, info.y);
            }
        }

        getPropertyInfoXY(x: number, y: number): PropertyInfo {
            var index = Helper.getIndexOfSorted(this.propertyInfos,
                y - this.lineHeight,
                function(list: any[], index: number) {
                    return list[index].y;
                });
            return this.propertyInfos[index];
        }

        draw(ctx) {
            if (this.object === null)
                return;

            this.propertyInfos.length = 0;

            this.lineHeight = this.fontSize * this.fontSpacing;

            var propertyList = this.getPropertyList(this.object);

            var propertyWidth: number = g_propertyCtx.canvas.width;
            var propertyHeight: number = g_propertyCtx.canvas.height;
            var padding: number = 2;
            var x: number = propertyWidth - this.width;
            var y: number = 0;

            // keep these properties for all property rendering
            ctx.strokeStyle = "black";
            ctx.textBaseline = "top";

            ctx.save();
            ctx.fillStyle = "#aaa";
            ctx.beginPath();
            ctx.rect(x, 0, this.width, propertyHeight);
            ctx.fill();
            ctx.clip();

            ctx.fillStyle = this.fontStyle;

            x += padding;

            this.drawObject(ctx, this.object, "", x, y);

            ctx.restore();
        }

        requestDraw() {
            var self = this;
            requestAnimationFrame(function() {
                self.draw(g_propertyCtx);
            });
        }

    }

    export module PropertyPanel {
        export enum DrawType {
            Names, Values
        };
    }

    export
    var g_propertyPanel: PropertyPanel = new PropertyPanel();
    export
    var g_propertyCtx = null;
}
