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
        object: any;
        name: string;
        index: number;
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

        // TODO this needs to relate to how we draw properties
        drawEditing(info: PropertyInfo, value: string) {
            var valueWidth: number = this.width - this.nameWidth;
            var x: number = g_propertyCtx.canvas.width - valueWidth;
            var y: number = info.y;
            g_propertyCtx.clearRect(x, y, valueWidth, this.lineHeight);
            g_propertyCtx.fillText(value, x, y);
        }

        getPropertyInfoXY(x: number, y: number): PropertyInfo {
            var index = Helper.getIndexOfSorted(this.propertyInfos,
                y - this.lineHeight,
                function(list: any[], index: number) {
                    return list[index].y;
                });
            return this.propertyInfos[index];
        }

        private drawProperties(ctx, object: any, x: number, y: number, drawType: PropertyPanel.DrawType) {
            var padding: number = 5;
            var propertyList: PropertyList = this.getPropertyList(object);

            for (var i: number = 0; i < propertyList.items.length; ++i) {
                var propItem: PropertyItem = propertyList.items[i];
                var isObject: boolean = propItem.type === "object";

                if (!isObject) {
                    if (drawType === PropertyPanel.DrawType.Names) {
                        ctx.fillText(propItem.name, x, y);
                    } else {
                        ctx.fillText(object[propItem.name], x, y);
                    }
                } else {
                    if (drawType === PropertyPanel.DrawType.Names) {
                        ctx.fillText("+" + propItem.name, x, y);
                    }
                }

                this.propertyInfos.push({
                    y: y,
                    object: object,
                    name: propItem.name,
                    index: i
                });

                y += this.lineHeight;

                if (propItem.type === "object") {
                    var newX: number = x;
                    if (drawType === PropertyPanel.DrawType.Names)
                        newX += padding;

                    this.drawProperties(ctx, object[propItem.name], newX, y, drawType);
                }
            }
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

            ctx.strokeStyle = "black";
            ctx.textBaseline = "top";

            ctx.fillStyle = "#aaa";
            ctx.fillRect(x, y, this.width, propertyHeight);
            ctx.fillStyle = "#bbb";
            ctx.fillRect(x + this.nameWidth, y, this.width - this.nameWidth, propertyHeight);

            if (ctx.fillStyle !== this.fontStyle)
                ctx.fillStyle = this.fontStyle;

            // property names
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, 0, this.nameWidth, propertyHeight);
            ctx.clip();

            x += padding;

            this.drawProperties(ctx, this.object, x, y, PropertyPanel.DrawType.Names);
            ctx.restore();

            // values
            y = 0;
            x = propertyWidth - this.nameWidth;

            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, this.width - this.nameWidth, propertyHeight);
            ctx.clip();

            x += padding;

            this.drawProperties(ctx, this.object, x, y, PropertyPanel.DrawType.Values);
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
