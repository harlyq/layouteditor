// Copyright 2014 Reece Elliott
var InteractionHelper;
(function (InteractionHelper) {
    "use strict";

    var Options = (function () {
        function Options() {
            this.DoubleClickTimeMS = 800;
            this.MouseCancelTapDistance = 10;
            this.TouchCancelTapDistance = 30;
            this.HoldTimeMS = 500;
        }
        return Options;
    })();
    InteractionHelper.Options = Options;

    (function (State) {
        State[State["Invalid"] = 0] = "Invalid";
        State[State["Start"] = 1] = "Start";
        State[State["Move"] = 2] = "Move";
        State[State["End"] = 3] = "End";
        State[State["DoubleClick"] = 4] = "DoubleClick";
        State[State["Held"] = 5] = "Held";
        State[State["MouseWheel"] = 6] = "MouseWheel";
    })(InteractionHelper.State || (InteractionHelper.State = {}));
    var State = InteractionHelper.State;

    var Event = (function () {
        function Event() {
            this.x = 0;
            this.y = 0;
            this.deltaX = 0;
            this.deltaY = 0;
            this.pinchDistance = 0;
            this.state = 0 /* Invalid */;
            this.target = null;
            this.origin = null;
        }
        return Event;
    })();
    InteractionHelper.Event = Event;

    var Watch = (function () {
        function Watch(elem, onPointerFunc, options) {
            this.elem = elem;
            this.onPointerFunc = onPointerFunc;
            this.options = null;
            this.tapTimeMS = 0;
            this.tapPosition = {
                x: -1,
                y: -1
            };
            this.heldID = 0;
            this.lastX = 0;
            this.lastY = 0;
            this.moveStarted = false;
            this.mouseX = 0;
            this.mouseY = 0;
            this.mouseUpHandler = null;
            this.mouseMoveHandler = null;
            this.touchEndHandler = null;
            this.touchMoveHandler = null;
            if (options)
                this.options = options;
            else
                this.options = new Options();

            var self = this;
            elem.addEventListener("mousedown", function (e) {
                self.mouseDown(e);
            });
            elem.addEventListener("touchstart", function (e) {
                self.touchStart(e);
            });
            elem.addEventListener("mousewheel", function (e) {
                self.mouseWheel(e);
            });
            elem.addEventListener("mousemove", function (e) {
                self.mouseX = e.pageX - self.elem.offsetLeft;
                self.mouseY = e.pageY - self.elem.offsetTop;
            });
        }
        Watch.prototype.heldTimeout = function () {
            var event = new Event();
            event.x = this.lastX;
            event.y = this.lastY;
            event.state = 5 /* Held */;
            event.target = this.elem;
            event.origin = this.elem;

            this.onPointerFunc(event);
        };

        Watch.prototype.startHeldTimer = function () {
            clearTimeout(this.heldID);
            var self = this;
            this.heldID = setTimeout(function () {
                self.heldTimeout();
            }, this.options.HoldTimeMS);
        };

        Watch.prototype.stopHeldTimer = function () {
            clearTimeout(this.heldID);
            this.heldID = 0;
        };

        Watch.prototype.mouseWheel = function (e) {
            e.preventDefault();

            var event = new Event();
            event.x = this.mouseX;
            event.y = this.mouseY;
            event.deltaX = e.deltaX;
            event.deltaY = e.deltaY;
            event.state = 6 /* MouseWheel */;
            event.target = e.target;
            event.origin = this.elem;

            this.onPointerFunc(event);
        };

        Watch.prototype.mouseDown = function (e) {
            e.preventDefault();

            var self = this;
            this.mouseMoveHandler = function (e) {
                self.mouseMove(e);
            };
            this.mouseUpHandler = function (e) {
                self.mouseUp(e);
            };
            document.addEventListener("mousemove", this.mouseMoveHandler);
            document.addEventListener("mouseup", this.mouseUpHandler);

            var x = e.pageX - this.elem.offsetLeft;
            var y = e.pageY - this.elem.offsetTop;

            var DoubleClick = false;
            var timeMS = Date.now();

            if (timeMS - this.tapTimeMS < this.options.DoubleClickTimeMS) {
                if (Math.abs(this.tapPosition.x - x) < this.options.MouseCancelTapDistance && Math.abs(this.tapPosition.y - y) < this.options.MouseCancelTapDistance) {
                    DoubleClick = true;
                    timeMS = 0;
                } else {
                    if (this.tapTimeMS !== 0) {
                        timeMS = 0;
                    }
                }
            }
            this.startHeldTimer();
            this.tapTimeMS = timeMS;
            this.tapPosition.x = x;
            this.tapPosition.y = y;
            this.moveStarted = false;

            var event = new Event();
            event.x = x;
            event.y = y;
            event.state = 1 /* Start */;
            event.target = e.target;
            event.origin = this.elem;

            this.onPointerFunc(event);

            if (DoubleClick) {
                event.state = 4 /* DoubleClick */;
                this.onPointerFunc(event);
            }

            this.lastX = x;
            this.lastY = y;
        };

        Watch.prototype.mouseMove = function (e) {
            e.preventDefault();

            var x = e.pageX - this.elem.offsetLeft;
            var y = e.pageY - this.elem.offsetTop;

            if (this.moveStarted || Math.abs(x - this.lastX) >= this.options.MouseCancelTapDistance || Math.abs(y - this.lastY) >= this.options.MouseCancelTapDistance) {
                this.stopHeldTimer();
                this.tapTimeMS = 0;
                this.moveStarted = true;

                var event = new Event();
                event.x = x;
                event.y = y;
                event.deltaX = x - this.lastX;
                event.deltaY = y - this.lastY;
                event.state = 2 /* Move */;
                event.target = e.target;
                event.origin = this.elem;

                this.onPointerFunc(event);
                this.lastX = x;
                this.lastY = y;
            }
        };

        Watch.prototype.mouseUp = function (e) {
            e.preventDefault();
            document.removeEventListener("mousemove", this.mouseMoveHandler);
            document.removeEventListener("mouseup", this.mouseUpHandler);

            var x = e.pageX - this.elem.offsetLeft;
            var y = e.pageY - this.elem.offsetTop;

            var event = new Event();
            event.x = x;
            event.y = y;
            event.deltaX = x - this.lastX;
            event.deltaY = y - this.lastY;
            event.state = 3 /* End */;
            event.target = e.target;
            event.origin = this.elem;

            this.onPointerFunc(event);
            this.lastX = 0;
            this.lastY = 0;
            this.stopHeldTimer();
        };

        Watch.prototype.getPinchInfo = function (e) {
            var touches = e.touches;
            if (touches.length === 0)
                touches = e.changedTouches;

            var x = 0;
            var y = 0;
            var distance = 0;

            if (touches.length >= 2) {
                var x2 = touches[1].pageX - this.elem.offsetLeft;
                var y2 = touches[1].pageY - this.elem.offsetTop;

                distance = Math.sqrt((x2 - x) * (x2 - x) + (y2 - y) * (y2 - y));
                x = (x2 + x) * 0.5;
                y = (y2 + y) * 0.5;
            } else if (touches.length == 1) {
                x = touches[0].pageX - this.elem.offsetLeft;
                y = touches[0].pageY - this.elem.offsetTop;
            }

            return {
                x: x,
                y: y,
                distance: distance
            };
        };

        Watch.prototype.touchStart = function (e) {
            e.preventDefault();

            var self = this;
            this.touchMoveHandler = function (e) {
                self.touchMove(e);
            };
            this.touchEndHandler = function (e) {
                self.touchEnd(e);
            };
            document.addEventListener("touchmove", this.touchMoveHandler);
            document.addEventListener("touchend", this.touchEndHandler);

            var pinch = this.getPinchInfo(e);
            var DoubleClick = false;
            var timeMS = Date.now();

            if (timeMS - this.tapTimeMS < this.options.DoubleClickTimeMS) {
                if (Math.abs(this.tapPosition.x - pinch.x) < this.options.TouchCancelTapDistance && Math.abs(this.tapPosition.y - pinch.y) < this.options.TouchCancelTapDistance) {
                    DoubleClick = true;
                    timeMS = 0;
                } else {
                    if (this.tapTimeMS !== 0)
                        timeMS = 0;
                }
            }
            this.startHeldTimer();
            this.tapTimeMS = timeMS;
            this.tapPosition.x = pinch.x;
            this.tapPosition.y = pinch.y;
            this.moveStarted = false;

            var event = new Event();
            event.x = pinch.x;
            event.y = pinch.y;
            event.pinchDistance = pinch.distance;
            event.state = 1 /* Start */;
            event.target = e.target;
            event.origin = this.elem;

            this.onPointerFunc(event);

            this.onPointerFunc(event);

            if (DoubleClick) {
                event.state = 4 /* DoubleClick */;
                this.onPointerFunc(event);
            }

            this.lastX = pinch.x;
            this.lastY = pinch.y;
        };

        Watch.prototype.touchMove = function (e) {
            e.preventDefault();

            var x = e.pageX - this.elem.offsetLeft;
            var y = e.pageY - this.elem.offsetTop;

            if (this.moveStarted || Math.abs(x - this.lastX) > this.options.TouchCancelTapDistance || Math.abs(y - this.lastY) > this.options.TouchCancelTapDistance) {
                this.moveStarted = true;
                var pinch = this.getPinchInfo(e);

                var event = new Event();
                event.x = pinch.x;
                event.y = pinch.y;
                event.deltaX = x - this.lastX;
                event.deltaY = y - this.lastY;
                event.pinchDistance = pinch.distance;
                event.state = 2 /* Move */;
                event.target = e.target;
                event.origin - this.elem;

                this.onPointerFunc(event);
                this.lastX = pinch.x;
                this.lastY = pinch.y;

                this.startHeldTimer();
                this.tapTimeMS = 0;
            }
        };

        Watch.prototype.touchEnd = function (e) {
            e.preventDefault();
            if (e.touches.length === 0) {
                document.removeEventListener("touchmove", this.touchMoveHandler);
                document.removeEventListener("touchend", this.touchEndHandler);
            }

            var x = e.pageX - this.elem.offsetLeft;
            var y = e.pageY - this.elem.offsetTop;

            var pinch = this.getPinchInfo(e);

            var event = new Event();
            event.x = pinch.x;
            event.y = pinch.y;
            event.deltaX = x - this.lastX;
            event.deltaY = y - this.lastY;
            event.pinchDistance = pinch.distance;
            event.state = 3 /* End */;
            event.target = e.target;
            event.origin - this.elem;

            this.onPointerFunc(event);
            this.lastX = 0;
            this.lastY = 0;
            this.stopHeldTimer();
        };
        return Watch;
    })();
    InteractionHelper.Watch = Watch;
})(InteractionHelper || (InteractionHelper = {}));
var Helper;
(function (Helper) {
    function assert(cond) {
        if (!cond)
            debugger;
    }
    Helper.assert = assert;

    function extend(obj, props) {
        if (!obj)
            obj = {};
        for (var key in props) {
            if (props.hasOwnProperty(key)) {
                if (typeof props[key] === "object") {
                    extend(obj[key], props[key]);
                } else {
                    obj[key] = props[key];
                }
            }
        }
        return obj;
    }
    Helper.extend = extend;

    function arrayMin(list, offset, stride) {
        if (typeof offset === "undefined") { offset = 0; }
        if (typeof stride === "undefined") { stride = 1; }
        if (list.length <= offset)
            return 0;

        var min = list[offset];
        for (var i = offset + stride; i < list.length; i += stride) {
            var val = list[i];
            if (val < min)
                min = val;
        }
        return min;
    }
    Helper.arrayMin = arrayMin;

    function arrayMax(list, offset, stride) {
        if (typeof offset === "undefined") { offset = 0; }
        if (typeof stride === "undefined") { stride = 1; }
        if (list.length <= offset)
            return 0;

        var max = list[offset];
        for (var i = offset + stride; i < list.length; i += stride) {
            var val = list[i];
            if (val > max)
                max = val;
        }
        return max;
    }
    Helper.arrayMax = arrayMax;

    function getIndexOfSorted(list, value, valueFunc) {
        var numList = list.length;
        if (numList === 0)
            return -1;
        if (typeof valueFunc === "undefined")
            valueFunc = function (list, index) {
                return list[index];
            };

        var i = 0;
        var j = numList - 1;
        var mid = 0;
        var midValue = 0;
        do {
            mid = (i + j) >> 1;
            midValue = valueFunc(list, mid);
            if (value === midValue)
                return mid;

            if (value < midValue) {
                j = mid - 1;
            } else {
                i = mid + 1;
            }
        } while(i <= j);

        return i;
    }
    Helper.getIndexOfSorted = getIndexOfSorted;
})(Helper || (Helper = {}));
var LayoutEditor;
(function (LayoutEditor) {
    LayoutEditor.EPSILON = 0.001;

    
})(LayoutEditor || (LayoutEditor = {}));
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    

    var PropertyPanel = (function () {
        function PropertyPanel(width) {
            if (typeof width === "undefined") { width = 150; }
            this.propertyLists = [];
            this.width = 0;
            this.nameWidth = 0;
            this.object = null;
            this.lineHeight = 0;
            this.propertyInfos = [];
            this.fontSize = 12;
            this.fontSpacing = 1.1;
            this.fontStyle = "black";
            this.setWidth(width);
        }
        PropertyPanel.prototype.setWidth = function (width) {
            this.width = width;
            this.nameWidth = width * 0.5;
        };

        PropertyPanel.prototype.setObject = function (obj) {
            this.object = obj;
        };

        PropertyPanel.prototype.addPropertyList = function (propertyList) {
            this.propertyLists.push(propertyList);
            this.requestDraw();
        };

        PropertyPanel.prototype.getPropertyList = function (obj) {
            for (var i = this.propertyLists.length - 1; i >= 0; --i) {
                if (this.propertyLists[i].isA(obj))
                    return this.propertyLists[i];
            }
        };

        // TODO this needs to relate to how we draw properties
        PropertyPanel.prototype.drawEditing = function (info, value) {
            var valueWidth = this.width - this.nameWidth;
            var x = LayoutEditor.g_propertyCtx.canvas.width - valueWidth;
            var y = info.y;
            LayoutEditor.g_propertyCtx.clearRect(x, y, valueWidth, this.lineHeight);
            LayoutEditor.g_propertyCtx.fillText(value, x, y);
        };

        PropertyPanel.prototype.getPropertyInfoXY = function (x, y) {
            var index = Helper.getIndexOfSorted(this.propertyInfos, y - this.lineHeight, function (list, index) {
                return list[index].y;
            });
            return this.propertyInfos[index];
        };

        PropertyPanel.prototype.drawProperties = function (ctx, object, x, y, drawType) {
            var padding = 5;
            var propertyList = this.getPropertyList(object);

            for (var i = 0; i < propertyList.items.length; ++i) {
                var propItem = propertyList.items[i];
                var isObject = propItem.type === "object";

                if (!isObject) {
                    if (drawType === 0 /* Names */) {
                        ctx.fillText(propItem.name, x, y);
                    } else {
                        ctx.fillText(object[propItem.name], x, y);
                    }
                } else {
                    if (drawType === 0 /* Names */) {
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
                    var newX = x;
                    if (drawType === 0 /* Names */)
                        newX += padding;

                    this.drawProperties(ctx, object[propItem.name], newX, y, drawType);
                }
            }
        };

        PropertyPanel.prototype.draw = function (ctx) {
            if (this.object === null)
                return;

            this.propertyInfos.length = 0;

            this.lineHeight = this.fontSize * this.fontSpacing;

            var propertyList = this.getPropertyList(this.object);

            var propertyWidth = LayoutEditor.g_propertyCtx.canvas.width;
            var propertyHeight = LayoutEditor.g_propertyCtx.canvas.height;
            var padding = 2;
            var x = propertyWidth - this.width;
            var y = 0;

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

            this.drawProperties(ctx, this.object, x, y, 0 /* Names */);
            ctx.restore();

            // values
            y = 0;
            x = propertyWidth - this.nameWidth;

            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, this.width - this.nameWidth, propertyHeight);
            ctx.clip();

            x += padding;

            this.drawProperties(ctx, this.object, x, y, 1 /* Values */);
            ctx.restore();
        };

        PropertyPanel.prototype.requestDraw = function () {
            var self = this;
            requestAnimationFrame(function () {
                self.draw(LayoutEditor.g_propertyCtx);
            });
        };
        return PropertyPanel;
    })();
    LayoutEditor.PropertyPanel = PropertyPanel;

    (function (PropertyPanel) {
        (function (DrawType) {
            DrawType[DrawType["Names"] = 0] = "Names";
            DrawType[DrawType["Values"] = 1] = "Values";
        })(PropertyPanel.DrawType || (PropertyPanel.DrawType = {}));
        var DrawType = PropertyPanel.DrawType;
        ;
    })(LayoutEditor.PropertyPanel || (LayoutEditor.PropertyPanel = {}));
    var PropertyPanel = LayoutEditor.PropertyPanel;

    LayoutEditor.g_propertyPanel = new PropertyPanel();
    LayoutEditor.g_propertyCtx = null;
})(LayoutEditor || (LayoutEditor = {}));
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    //------------------------------
    var Style = (function () {
        function Style(name) {
            this.name = "";
            this.strokeStyle = "black";
            this.fillStyle = "none";
            this.lineWidth = 1;
            this.lineDash = [];
            this.textAlign = "center";
            this.textBaseline = "middle";
            this.fontSize = 20;
            this.fontFamily = "arial";
            this.fontWeight = "normal";
            this.fontStyle = "black";
            this.fontSpacing = 1;
            if (typeof name === "undefined")
                this.name = "Style" + Style.uniqueID++;
            else
                this.name = name;
        }
        Style.prototype.draw = function (ctx) {
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
        };

        Style.prototype.saveData = function () {
            return Helper.extend({}, this);
        };

        Style.prototype.loadData = function (obj) {
            Helper.extend(this, obj);
        };
        Style.uniqueID = 1;
        return Style;
    })();
    LayoutEditor.Style = Style;
    LayoutEditor.g_drawStyle = new Style("draw");
    LayoutEditor.g_selectStyle = new Style("select");
    LayoutEditor.g_snapStyle = new Style("snap");
    LayoutEditor.g_propertyStyle = new Style("property");

    LayoutEditor.g_drawStyle.strokeStyle = "red";
    LayoutEditor.g_drawStyle.lineDash = [2, 2];
    LayoutEditor.g_selectStyle.strokeStyle = "blue";
    LayoutEditor.g_selectStyle.lineDash = [5, 5];
    LayoutEditor.g_snapStyle.strokeStyle = "red";
    LayoutEditor.g_propertyStyle.strokeStyle = "none";
    LayoutEditor.g_propertyStyle.fillStyle = "#c0c0c0";
    LayoutEditor.g_propertyStyle.textBaseline = "top";
    LayoutEditor.g_propertyStyle.textAlign = "left";
    LayoutEditor.g_propertyStyle.fontSize = 12;
    LayoutEditor.g_propertyStyle.fontSpacing = 1.1;

    LayoutEditor.g_style = null;

    var StyleList = (function () {
        function StyleList() {
            this.styles = [];
            this.reset();
        }
        StyleList.prototype.reset = function () {
            this.styles.length = 0;

            var defaultStyle = new Style("default");
            defaultStyle.fillStyle = "white";

            this.styles.push(defaultStyle);
            LayoutEditor.g_style = defaultStyle;
        };

        StyleList.prototype.getStyle = function (name) {
            for (var i = 0; i < this.styles.length; ++i) {
                var style = this.styles[i];
                if (style.name === name)
                    return style;
            }

            return null;
        };

        StyleList.prototype.duplicateStyle = function (style) {
            var newStyle = new Style();
            Helper.extend(newStyle, style);
            this.styles.push(newStyle);

            return newStyle;
        };

        StyleList.prototype.removeStyle = function (style) {
            var index = this.styles.indexOf(style);
            if (index !== -1)
                this.styles.splice(index, 1);
            return index !== -1;
        };

        StyleList.prototype.saveData = function () {
            var obj = {
                styles: []
            };

            for (var i = 0; i < this.styles.length; ++i) {
                obj.styles.push(this.styles[i].saveData());
            }

            return obj;
        };

        StyleList.prototype.loadData = function (obj) {
            this.reset();
            this.styles.length = 0; // we will load the default style

            for (var i = 0; i < obj.styles.length; ++i) {
                var style = new Style();
                style.loadData(obj.styles[i]);
                this.styles.push(style);
            }

            LayoutEditor.g_style = this.getStyle("default");
        };

        StyleList.prototype.getReferenceList = function () {
            var items;
            for (var i = 0; i < this.styles.length; i++) {
                var style = this.styles[i];
                items.push({
                    object: style,
                    name: style.name
                });
            }
            return items;
        };
        return StyleList;
    })();
    LayoutEditor.StyleList = StyleList;

    LayoutEditor.g_styleList = new StyleList();

    LayoutEditor.g_propertyPanel.addPropertyList({
        isA: function (obj) {
            return obj instanceof Style;
        },
        items: [
            {
                name: "strokeStyle"
            }, {
                name: "fillStyle"
            }, {
                name: "lineWidth"
            }, {
                name: "textAlign"
            }, {
                name: "textBaseline"
            }, {
                name: "fontSize"
            }, {
                name: "fontFamily"
            }, {
                name: "fontWeight"
            }, {
                name: "fontStyle"
            }, {
                name: "fontSpacing"
            }]
    });
})(LayoutEditor || (LayoutEditor = {}));
/// <reference path="helper.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    //------------------------------
    var PanZoom = (function () {
        function PanZoom() {
            this.pan = {
                x: 0,
                y: 0
            };
            this.zoom = 1;
            // raw input values
            this.x = 0;
            this.y = 0;
            this.deltaX = 0;
            this.deltaY = 0;
            this.pinchDistance = 0;
        }
        PanZoom.prototype.reset = function () {
            this.constructor();
        };

        PanZoom.prototype.toX = function (x) {
            return (x - this.pan.x) / this.zoom;
        };
        PanZoom.prototype.toY = function (y) {
            return (y - this.pan.y) / this.zoom;
        };
        PanZoom.prototype.toH = function (h) {
            return h / this.zoom;
        };
        PanZoom.prototype.toW = function (w) {
            return w / this.zoom;
        };

        PanZoom.prototype.calcXY = function (x, y) {
            var newPos = {
                x: 0,
                y: 0
            };
            newPos.x = x * this.zoom + this.pan.x;
            newPos.y = y * this.zoom + this.pan.y;
            return newPos;
        };

        PanZoom.prototype.invXY = function (x, y) {
            var invPos = {
                x: 0,
                y: 0
            };
            invPos.x = (x - this.pan.x) / this.zoom;
            invPos.y = (y - this.pan.y) / this.zoom;
            return invPos;
        };

        PanZoom.prototype.translate = function (ctx, x, y) {
            ctx.translate(x * this.zoom + this.pan.x, y * this.zoom + this.pan.y);
        };

        PanZoom.prototype.scale = function (ctx, x, y) {
            ctx.scale(x * this.zoom, y * this.zoom);
        };

        PanZoom.prototype.transform = function (ctx, translateX, translateY, rotate, scaleX, scaleY) {
            if (typeof translateX === "undefined") { translateX = 0; }
            if (typeof translateY === "undefined") { translateY = 0; }
            if (typeof rotate === "undefined") { rotate = 0; }
            if (typeof scaleX === "undefined") { scaleX = 1; }
            if (typeof scaleY === "undefined") { scaleY = 1; }
            ctx.translate(translateX * this.zoom + this.pan.x, translateY * this.zoom + this.pan.y);
            ctx.rotate(rotate);
            ctx.scale(scaleX * this.zoom, scaleY * this.zoom);
        };

        PanZoom.prototype.saveData = function () {
            return {
                type: "PanZoom",
                pan: {
                    x: this.pan.x,
                    y: this.pan.y
                },
                zoom: this.zoom
            };
        };

        PanZoom.prototype.loadData = function (obj) {
            Helper.assert(obj.type === "PanZoom");
            this.reset();
            Helper.extend(this, obj);
        };
        return PanZoom;
    })();
    LayoutEditor.PanZoom = PanZoom;
    LayoutEditor.g_panZoom = new PanZoom();
})(LayoutEditor || (LayoutEditor = {}));
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    //------------------------------
    var Bounds = (function () {
        function Bounds() {
            this.rotate = 0;
        }
        Bounds.prototype.toPolygon = function () {
            var cr = Math.cos(this.rotate);
            var sr = Math.sin(this.rotate);

            var polygon = [-this.hw, -this.hh, this.hw, -this.hh, this.hw, this.hh, -this.hw, this.hh];
            for (var i = 0; i < polygon.length; i += 2) {
                var x = polygon[i];
                var y = polygon[i + 1];
                polygon[i] = x * cr - y * sr + this.cx;
                polygon[i + 1] = x * sr + y * cr + this.cy;
            }

            return polygon;
        };

        Bounds.prototype.invXY = function (x, y) {
            var newPos = {
                x: 0,
                y: 0
            };

            var sr = Math.sin(this.rotate);
            var cr = Math.cos(this.rotate);

            newPos.x = x - this.cx;
            newPos.y = y - this.cy;

            var lx = 0;
            var ly = 0;

            if (Math.abs(cr) < LayoutEditor.EPSILON) {
                lx = newPos.y / sr;
                ly = -newPos.x / sr;
            } else if (Math.abs(sr) < LayoutEditor.EPSILON) {
                lx = newPos.x / cr;
                ly = newPos.y / cr;
            } else {
                lx = (newPos.x * cr + newPos.y * sr) / (cr * cr + sr * sr);
                ly = (newPos.y - lx * sr) / cr;
            }

            return {
                x: lx,
                y: ly
            };
        };
        return Bounds;
    })();
    LayoutEditor.Bounds = Bounds;

    function drawPolygon(ctx, polygon) {
        if (polygon.length < 4)
            return;

        ctx.strokeStyle = "green";
        ctx.moveTo(polygon[0], polygon[1]);
        for (var i = 2; i < polygon.length; i += 2) {
            ctx.lineTo(polygon[i], polygon[i + 1]);
        }
        ;
        ctx.lineTo(polygon[0], polygon[1]);
        ctx.stroke();
    }
    LayoutEditor.drawPolygon = drawPolygon;

    //------------------------------
    var Transform = (function () {
        function Transform() {
            this.rotate = 0;
            this.scale = {
                x: 1,
                y: 1
            };
            this.translate = {
                x: 0,
                y: 0
            };
        }
        Transform.prototype.calcXY = function (x, y) {
            var newPos = {
                x: 0,
                y: 0
            };
            var sr = Math.sin(this.rotate);
            var cr = Math.cos(this.rotate);

            var lx = (x - this.translate.x) * this.scale.x;
            var ly = (y - this.translate.y) * this.scale.y;
            newPos.x = (lx * cr - ly * sr) + this.translate.x;
            newPos.y = (lx * sr + ly * cr) + this.translate.y;

            return newPos;
        };

        Transform.prototype.invXY = function (x, y) {
            var newPos = {
                x: 0,
                y: 0
            };

            var sr = Math.sin(this.rotate);
            var cr = Math.cos(this.rotate);

            newPos.x = x - this.translate.x;
            newPos.y = y - this.translate.y;

            var lx = 0;
            var ly = 0;

            if (Math.abs(cr) < LayoutEditor.EPSILON) {
                lx = newPos.y / sr;
                ly = -newPos.x / sr;
            } else if (Math.abs(sr) < LayoutEditor.EPSILON) {
                lx = newPos.x / cr;
                ly = newPos.y / cr;
            } else {
                lx = (newPos.x * cr + newPos.y * sr) / (cr * cr + sr * sr);
                ly = (newPos.y - lx * sr) / cr;
            }

            lx /= this.scale.x;
            ly /= this.scale.y;

            return {
                x: lx,
                y: ly
            };
        };
        return Transform;
    })();
    LayoutEditor.Transform = Transform;

    //------------------------------
    var Shape = (function () {
        function Shape() {
            this.style = LayoutEditor.g_style;
            this.isDeleted = false;
            this.oabb = new Bounds();
            this.aabb = new Bounds();
            this.transform = new Transform();
            this.name = "";
            this.text = "";
            this.name = "Shape" + Shape.uniqueID++;
        }
        Shape.prototype.setStyle = function (style) {
            this.style = style;
        };

        Shape.prototype.draw = function (ctx) {
            this.style.draw(ctx);

            this.buildPath(ctx);

            if (this.style.fillStyle !== "none")
                ctx.fill();
            if (this.style.strokeStyle !== "none")
                ctx.stroke();

            this.drawText(ctx);
        };

        // implemented in the derived class
        Shape.prototype.buildPath = function (ctx) {
        };

        Shape.prototype.drawSelect = function (ctx) {
            var oabb = this.oabb;
            ctx.save();
            LayoutEditor.g_panZoom.transform(ctx, oabb.cx, oabb.cy, oabb.rotate);
            ctx.beginPath();
            ctx.rect(-oabb.hw, -oabb.hh, oabb.hw * 2, oabb.hh * 2);
            ctx.restore();
            ctx.stroke();
        };

        Shape.prototype.drawAABB = function (ctx) {
            var aabb = this.aabb;
            ctx.save();
            LayoutEditor.g_panZoom.transform(ctx);
            ctx.beginPath();
            ctx.rect(aabb.cx - aabb.hw, aabb.cy - aabb.hh, aabb.hw * 2, aabb.hh * 2);
            ctx.restore();
            ctx.stroke();
        };

        Shape.prototype.drawText = function (ctx) {
            if (this.text.length === 0)
                return;

            var oabb = this.oabb;

            ctx.save();
            LayoutEditor.g_panZoom.transform(ctx, oabb.cx, oabb.cy, oabb.rotate);

            var textLines = this.text.split("\n");
            var lineHeight = this.style.fontSize * this.style.fontSpacing;
            var textWidth = 0;
            var textHeight = textLines.length * lineHeight;

            for (var i = 0; i < textLines.length; ++i) {
                var lineWidth = ctx.measureText(textLines[i]).width;
                if (lineWidth > textWidth)
                    textWidth = lineWidth;
            }

            var hh = oabb.hh;
            var hw = oabb.hw;
            var x = 0;
            var y = 0;
            switch (this.style.textBaseline) {
                case "top":
                    y = -hh;
                    break;
                case "middle":
                    y = (lineHeight - textHeight) * 0.5;
                    break;
                case "bottom":
                    y = hh - textHeight + lineHeight;
                    break;
            }

            switch (this.style.textAlign) {
                case "left":
                    x = -hw;
                    break;
                case "right":
                    x = hw;
                    break;
            }

            if (ctx.fillStlye !== this.style.fontStyle)
                ctx.fillStyle = this.style.fontStyle;

            for (var i = 0; i < textLines.length; ++i) {
                ctx.fillText(textLines[i], x, y);
                y += lineHeight;
            }

            ctx.restore();
        };

        // performed by the derived class
        Shape.prototype.calculateBounds = function () {
        };

        Shape.prototype.isInsideXY = function (ctx, x, y) {
            var u = x * LayoutEditor.g_panZoom.zoom + LayoutEditor.g_panZoom.pan.x;
            var v = y * LayoutEditor.g_panZoom.zoom + LayoutEditor.g_panZoom.pan.y;

            this.buildPath(ctx);
            return ctx.isPointInPath(u, v);
        };

        Shape.prototype.isOverlapBounds = function (bounds) {
            var polygonA = this.aabb.toPolygon();
            var polygonB = bounds.toPolygon();

            for (var i = 0; i < 2; ++i) {
                var polygon = (i === 0 ? polygonA : polygonB);
                var x1 = polygon[polygon.length - 2];
                var y1 = polygon[polygon.length - 1];

                for (var j = 0; j < polygon.length; j += 2) {
                    var x2 = polygon[j];
                    var y2 = polygon[j + 1];
                    var normalX = y1 - y2;
                    var normalY = x2 - x1;
                    x1 = x2;
                    y1 = y2;

                    var minA;
                    var maxA;
                    for (var k = 0; k < polygonA.length; k += 2) {
                        var projected = normalX * polygonA[k] + normalY * polygonA[k + 1];
                        if (k === 0 || projected < minA) {
                            minA = projected;
                        }
                        if (k === 0 || projected > maxA) {
                            maxA = projected;
                        }
                    }

                    var minB;
                    var maxB;
                    for (var k = 0; k < polygonB.length; k += 2) {
                        var projected = normalX * polygonB[k] + normalY * polygonB[k + 1];
                        if (k === 0 || projected < minB) {
                            minB = projected;
                        }
                        if (k === 0 || projected > maxB) {
                            maxB = projected;
                        }
                    }

                    if (maxA < minB || maxB < minA)
                        return false;
                }
            }

            return true;
        };

        Shape.prototype.copy = function (base) {
            if (!base)
                base = new Shape();
            Helper.extend(base, this);
            return base;
        };

        // overloaded by specific shape
        Shape.prototype.saveData = function () {
            return {
                name: this.name,
                text: this.text,
                style: this.style.name,
                transform: this.transform
            };
        };

        // overloaded by specific shape
        Shape.prototype.loadData = function (obj) {
            this.name = obj.name;
            this.text = obj.text;
            this.style = LayoutEditor.g_styleList.getStyle(obj.style);
            Helper.extend(this.transform, obj.transform);
        };
        Shape.uniqueID = 0;
        return Shape;
    })();
    LayoutEditor.Shape = Shape;

    var RectShape = (function (_super) {
        __extends(RectShape, _super);
        function RectShape(w, h) {
            _super.call(this);
            this.w = w;
            this.h = h;
        }
        RectShape.prototype.buildPath = function (ctx) {
            var transform = this.transform;

            ctx.save();
            LayoutEditor.g_panZoom.transform(ctx, transform.translate.x, transform.translate.y, transform.rotate, transform.scale.x, transform.scale.y);

            ctx.beginPath();
            ctx.rect(-this.w * 0.5, -this.h * 0.5, this.w, this.h);
            ctx.restore();
        };

        RectShape.prototype.copy = function (base) {
            if (!base)
                base = new RectShape(this.w, this.h);
            _super.prototype.copy.call(this, base);
            Helper.extend(base, this);
            return base;
        };

        RectShape.prototype.fromRect = function (x, y, w, h) {
            this.transform.translate.x = x + w * 0.5;
            this.transform.translate.y = y + h * 0.5;
            this.w = w;
            this.h = h;
            this.calculateBounds();
        };

        RectShape.prototype.calculateBounds = function () {
            var transform = this.transform;
            var dx = this.w * 0.5;
            var dy = this.h * 0.5;

            this.oabb.rotate = transform.rotate;
            this.oabb.hw = Math.abs(dx) * transform.scale.x;
            this.oabb.hh = Math.abs(dy) * transform.scale.y;
            this.oabb.cx = transform.translate.x;
            this.oabb.cy = transform.translate.y;

            var polygon = this.oabb.toPolygon();
            var x1 = Helper.arrayMin(polygon, 0, 2);
            var x2 = Helper.arrayMax(polygon, 0, 2);
            var y1 = Helper.arrayMin(polygon, 1, 2);
            var y2 = Helper.arrayMax(polygon, 1, 2);

            this.aabb.rotate = 0;
            this.aabb.hw = (x2 - x1) * 0.5;
            this.aabb.hh = (y2 - y1) * 0.5;
            this.aabb.cx = (x1 + x2) * 0.5;
            this.aabb.cy = (y1 + y2) * 0.5;
        };

        RectShape.prototype.saveData = function () {
            var obj = _super.prototype.saveData.call(this);
            obj.type = "RectShape";
            obj.w = this.w;
            obj.h = this.h;
            obj.text = this.text;
            return obj;
        };

        RectShape.prototype.loadData = function (obj) {
            Helper.assert(obj.type === "RectShape");
            this.w = obj.w;
            this.h = obj.h;
            this.text = obj.text;
            _super.prototype.loadData.call(this, obj);
        };
        return RectShape;
    })(Shape);
    LayoutEditor.RectShape = RectShape;

    var EllipseShape = (function (_super) {
        __extends(EllipseShape, _super);
        function EllipseShape(rx, ry) {
            _super.call(this);
            this.rx = rx;
            this.ry = ry;
        }
        EllipseShape.prototype.buildPath = function (ctx) {
            var transform = this.transform;
            var rx = Math.abs(this.rx);
            var ry = Math.abs(this.ry);

            ctx.save();
            LayoutEditor.g_panZoom.transform(ctx, transform.translate.x, transform.translate.y, transform.rotate, transform.scale.x, transform.scale.y);

            var kappa = .5522848, ox = rx * kappa, oy = ry * kappa;

            ctx.beginPath();
            ctx.moveTo(-rx, 0);
            ctx.bezierCurveTo(-rx, -oy, -ox, -ry, 0, -ry);
            ctx.bezierCurveTo(ox, -ry, rx, -oy, rx, 0);
            ctx.bezierCurveTo(rx, oy, ox, ry, 0, ry);
            ctx.bezierCurveTo(-ox, ry, -rx, oy, -rx, 0);

            // ctx.beginPath();
            // ctx.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI);    chrome only
            ctx.restore();
        };

        EllipseShape.prototype.copy = function (base) {
            if (!base)
                base = new EllipseShape(this.rx, this.ry);
            _super.prototype.copy.call(this, base);
            Helper.extend(base, this);
            return base;
        };

        EllipseShape.prototype.fromRect = function (x, y, w, h) {
            this.transform.translate.x = x + w * 0.5;
            this.transform.translate.y = y + h * 0.5;
            this.rx = w * 0.5;
            this.ry = h * 0.5;
            this.calculateBounds();
        };

        EllipseShape.prototype.calculateBounds = function () {
            var transform = this.transform;

            var hw = this.rx * transform.scale.x;
            var hh = this.ry * transform.scale.y;

            this.oabb.rotate = transform.rotate;
            this.oabb.hw = hw;
            this.oabb.hh = hh;
            this.oabb.cx = transform.translate.x;
            this.oabb.cy = transform.translate.y;

            this.aabb.rotate = 0;

            var rot = this.transform.rotate;
            var ux = hw * Math.cos(rot);
            var uy = hw * Math.sin(rot);
            var vx = hh * Math.cos(rot + Math.PI * 0.5);
            var vy = hh * Math.sin(rot + Math.PI * 0.5);

            var rotatedHW = Math.sqrt(ux * ux + vx * vx);
            var rotatedHH = Math.sqrt(uy * uy + vy * vy);

            this.aabb.cx = this.oabb.cx;
            this.aabb.cy = this.oabb.cy;
            this.aabb.hw = rotatedHW;
            this.aabb.hh = rotatedHH;
        };

        EllipseShape.prototype.saveData = function () {
            var obj = _super.prototype.saveData.call(this);
            obj.type = "EllipseShape";
            obj.rx = this.rx;
            obj.ry = this.ry;
            return obj;
        };

        EllipseShape.prototype.loadData = function (obj) {
            Helper.assert(obj.type === "EllipseShape");
            this.rx = obj.rx;
            this.ry = obj.ry;
            _super.prototype.loadData.call(this, obj);
        };
        return EllipseShape;
    })(Shape);
    LayoutEditor.EllipseShape = EllipseShape;

    // cannot transform!!!
    var AABBShape = (function (_super) {
        __extends(AABBShape, _super);
        function AABBShape() {
            _super.call(this);
        }
        AABBShape.prototype.copy = function (base) {
            if (!base)
                base = new AABBShape();
            _super.prototype.copy.call(this, base);
            Helper.extend(base, this);
            return base;
        };

        AABBShape.prototype.buildPath = function (ctx) {
            // don't apply transform!
            var x1 = this.oabb.cx - this.oabb.hw;
            var y1 = this.oabb.cy - this.oabb.hh;
            ctx.save();
            LayoutEditor.g_panZoom.transform(ctx);
            ctx.beginPath();
            ctx.rect(x1, y1, this.oabb.hw * 2, this.oabb.hh * 2);
            ctx.restore();
        };

        AABBShape.prototype.calculateBounds = function () {
            var hw = (this.x2 - this.x1) * 0.5;
            var hh = (this.y2 - this.y1) * 0.5;

            this.oabb.rotate = 0;
            this.oabb.cx = this.x1 + hw;
            this.oabb.cy = this.y1 + hh;
            this.oabb.hw = Math.abs(hw);
            this.oabb.hh = Math.abs(hh);

            this.aabb = this.oabb;
        };

        AABBShape.prototype.saveData = function () {
            var obj = _super.prototype.saveData.call(this);
            obj.type = "AABBShape";
            obj.x1 = this.x1;
            obj.y1 = this.y1;
            obj.x2 = this.x2;
            obj.y2 = this.y2;
            return obj;
        };

        AABBShape.prototype.loadData = function (obj) {
            Helper.assert(obj.type === "AABBShape");
            this.x1 = obj.x1;
            this.y1 = obj.y1;
            this.x2 = obj.x2;
            this.y2 = obj.y2;
            _super.prototype.loadData.call(this, obj);
        };
        return AABBShape;
    })(Shape);
    LayoutEditor.AABBShape = AABBShape;

    //------------------------------
    var ShapeList = (function () {
        function ShapeList() {
            this.shapes = [];
            this.selectedShapes = [];
            this.selectedStyle = new LayoutEditor.Style();
            this.hitCtx = document.createElement("canvas").getContext("2d");

            this.selectedStyle.strokeStyle = "blue";
            this.selectedStyle.fillStyle = "none";
            this.selectedStyle.lineWidth = 2;
            this.selectedStyle.lineDash = [5, 5];
        }
        ShapeList.prototype.reset = function () {
            this.shapes.length = 0;
            this.selectedShapes.length = 0;
        };

        ShapeList.prototype.addShape = function (shape) {
            shape.isDeleted = false;
            this.shapes.push(shape);
        };

        ShapeList.prototype.removeShape = function (shape) {
            shape.isDeleted = true;
        };

        ShapeList.prototype.toggleSelected = function (shapes) {
            for (var i = 0; i < shapes.length; ++i) {
                var shape = shapes[i];
                var index = this.selectedShapes.indexOf(shape);
                if (index === -1)
                    this.selectedShapes.push(shape);
                else
                    this.selectedShapes.splice(index, 1);
            }
        };

        ShapeList.prototype.setSelectedShapes = function (shapes) {
            this.selectedShapes = shapes.slice(); // copy
        };

        ShapeList.prototype.getSelectedShapes = function () {
            return this.selectedShapes;
        };

        ShapeList.prototype.clearSelectedShapes = function () {
            this.selectedShapes.length = 0;
        };

        ShapeList.prototype.requestDraw = function (ctx) {
            var self = this;
            requestAnimationFrame(function () {
                self.draw(ctx);
            });
        };

        ShapeList.prototype.requestDrawSelect = function (ctx) {
            var self = this;
            requestAnimationFrame(function () {
                self.drawSelect(ctx);
            });
        };

        ShapeList.prototype.draw = function (ctx) {
            this.clear(ctx);

            // normal shapes
            var numShapes = this.shapes.length;
            for (var i = 0; i < numShapes; ++i) {
                var shape = this.shapes[i];
                if (!shape.isDeleted)
                    shape.draw(ctx);
            }
        };

        ShapeList.prototype.drawSelect = function (ctx) {
            this.selectedStyle.draw(ctx);
            this.clear(ctx);

            // selected shapes
            var numSelectedShapes = this.selectedShapes.length;
            for (var i = 0; i < numSelectedShapes; ++i) {
                var shape = this.selectedShapes[i];
                Helper.assert(!shape.isDeleted);
                shape.drawSelect(ctx);
            }
        };

        ShapeList.prototype.clear = function (ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        };

        ShapeList.prototype.getShapeInXY = function (x, y) {
            for (var i = this.shapes.length - 1; i >= 0; --i) {
                var shape = this.shapes[i];
                if (!shape.isDeleted && shape.isInsideXY(this.hitCtx, x, y))
                    return shape;
            }

            return null;
        };

        ShapeList.prototype.getShapesInBounds = function (bounds) {
            var shapes = [];

            for (var i = this.shapes.length - 1; i >= 0; --i) {
                var shape = this.shapes[i];
                if (!shape.isDeleted && shape.isOverlapBounds(bounds)) {
                    shape.isOverlapBounds(bounds);
                    shapes.push(shape);
                }
            }

            return shapes;
        };

        ShapeList.prototype.create = function (type) {
            switch (type) {
                case "RectShape":
                    return new RectShape(0, 0);
                case "EllipseShape":
                    return new EllipseShape(0, 0);
                case "AABBShape":
                    return new AABBShape();
            }
        };

        ShapeList.prototype.saveData = function () {
            var obj = {
                shapes: []
            };
            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                if (!shape.isDeleted) {
                    obj.shapes.push(shape.saveData());
                }
            }
            return obj;
        };

        ShapeList.prototype.loadData = function (obj) {
            this.reset();
            for (var i = 0; i < obj.shapes.length; ++i) {
                var shapeSave = obj.shapes[i];
                var newShape = this.create(shapeSave.type);
                newShape.loadData(shapeSave);
                newShape.calculateBounds();
                LayoutEditor.g_shapeList.addShape(newShape);
            }
        };
        return ShapeList;
    })();
    LayoutEditor.ShapeList = ShapeList;
    LayoutEditor.g_shapeList = new ShapeList();

    LayoutEditor.g_propertyPanel.addPropertyList({
        isA: function (obj) {
            return obj instanceof Shape;
        },
        items: [
            {
                name: "name"
            }, {
                name: "style",
                type: "object",
                getReferenceList: function () {
                    return LayoutEditor.g_styleList.getReferenceList();
                }
            }]
    });
})(LayoutEditor || (LayoutEditor = {}));
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    function insertSortedUnique(list, value) {
        var numList = list.length;
        if (numList === 0)
            return list.splice(0, 0, value);

        var i = 0;
        var j = numList - 1;
        var mid = 0;
        var midValue = 0;
        do {
            mid = (i + j) >> 1;
            midValue = list[mid];
            if (value === midValue)
                return;

            if (value < midValue) {
                j = mid - 1;
            } else {
                i = mid + 1;
            }
        } while(i <= j);

        if (value < midValue)
            list.splice(mid, 0, value);
        else
            list.splice(mid + 1, 0, value);
    }

    //------------------------------
    var Grid = (function () {
        function Grid() {
            this.snapToGrid = false;
            this.gridSize = 10;
            this.snapToShape = true;
            this.xTabs = [];
            this.yTabs = [];
            this.shapeGravity = 10;
            this.snappedX = -1;
            this.snappedY = -1;
        }
        Grid.prototype.getClosestIndex = function (list, value, index) {
            var bestDist = Math.abs(value - list[index]);
            var bestIndex = index;
            var leftIndex = index - 1;
            var rightIndex = index + 1;

            if (rightIndex < list.length) {
                var dist = Math.abs(value - list[rightIndex]);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIndex = rightIndex;
                }
            }

            if (leftIndex >= 0) {
                var dist = Math.abs(value - list[leftIndex]);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIndex = leftIndex;
                }
            }

            return bestIndex;
        };

        Grid.prototype.snapXY = function (x, y) {
            var pos = {
                x: x,
                y: y
            };

            if (this.snapToGrid) {
                pos.x = pos.x % this.gridSize;
                pos.y = pos.y % this.gridSize;
            } else if (this.snapToShape) {
                var i = Helper.getIndexOfSorted(this.xTabs, pos.x);
                i = this.getClosestIndex(this.xTabs, pos.x, i);
                if (Math.abs(this.xTabs[i] - pos.x) < this.shapeGravity) {
                    pos.x = this.xTabs[i];
                    this.snappedX = pos.x;
                } else {
                    this.snappedX = -1;
                }

                var j = Helper.getIndexOfSorted(this.yTabs, pos.y);
                j = this.getClosestIndex(this.yTabs, pos.y, j);
                if (Math.abs(this.yTabs[j] - pos.y) < this.shapeGravity) {
                    pos.y = this.yTabs[j];
                    this.snappedY = pos.y;
                } else {
                    this.snappedY = -1;
                }
            }

            return pos;
        };

        Grid.prototype.rebuildTabs = function (excludeShapes) {
            if (typeof excludeShapes === "undefined") { excludeShapes = []; }
            if (!this.snapToShape)
                return;

            this.xTabs.length = 0;
            this.yTabs.length = 0;

            for (var i = 0; i < LayoutEditor.g_shapeList.shapes.length; ++i) {
                var shape = LayoutEditor.g_shapeList.shapes[i];
                if (shape.isDeleted || excludeShapes.indexOf(shape) !== -1)
                    continue;

                var polygon = shape.aabb.toPolygon();
                var x1 = Helper.arrayMin(polygon, 0, 2);
                var x2 = Helper.arrayMax(polygon, 0, 2);
                var y1 = Helper.arrayMin(polygon, 1, 2);
                var y2 = Helper.arrayMax(polygon, 1, 2);
                var cx = (x1 + x2) * 0.5;
                var cy = (y1 + y2) * 0.5;

                insertSortedUnique(this.xTabs, x1);
                insertSortedUnique(this.xTabs, x2);
                insertSortedUnique(this.xTabs, cx);
                insertSortedUnique(this.yTabs, y1);
                insertSortedUnique(this.yTabs, y2);
                insertSortedUnique(this.yTabs, cy);
            }
            // ctx.save();
            // g_panZoom.transform(g_toolCtx);
            // g_toolCtx.beginPath();
            // for (var i = 0; i < this.xTabs.length; ++i) {
            //     g_toolCtx.moveTo(this.xTabs[i], 0);
            //     g_toolCtx.lineTo(this.xTabs[i], 1000);
            // }
            // for (var i = 0; i < this.yTabs.length; ++i) {
            //     g_toolCtx.moveTo(0, this.yTabs[i]);
            //     g_toolCtx.lineTo(1000, this.yTabs[i]);
            // }
            // g_toolCtx.stroke();
            // ctx.restore();
        };
        return Grid;
    })();
    LayoutEditor.Grid = Grid;
    LayoutEditor.g_grid = new Grid();
})(LayoutEditor || (LayoutEditor = {}));
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    

    var CommandList = (function () {
        function CommandList() {
            this.commands = [];
            this.currentIndex = 0;
        }
        CommandList.prototype.addCommand = function (command) {
            this.commands.length = this.currentIndex; // clip to the current undo level
            this.commands.push(command);
            this.currentIndex = this.commands.length; // past the end of the list
            command.redo();
        };

        CommandList.prototype.reset = function () {
            this.commands.length = 0;
            this.currentIndex = 0;
        };

        CommandList.prototype.undo = function () {
            if (this.currentIndex <= 0)
                return;

            this.currentIndex--;
            this.commands[this.currentIndex].undo();
        };

        CommandList.prototype.redo = function () {
            if (this.currentIndex >= this.commands.length)
                return;

            this.commands[this.currentIndex].redo();
            this.currentIndex++;
        };
        return CommandList;
    })();
    LayoutEditor.CommandList = CommandList;
    LayoutEditor.g_commandList = new CommandList();

    var ShapeCommand = (function () {
        function ShapeCommand() {
            this.shape = null;
        }
        ShapeCommand.prototype.redo = function () {
            LayoutEditor.g_shapeList.addShape(this.shape);
            LayoutEditor.g_shapeList.requestDraw(LayoutEditor.g_drawCtx);

            LayoutEditor.g_propertyPanel.setObject(this.shape);
            LayoutEditor.g_propertyPanel.requestDraw();
        };

        ShapeCommand.prototype.undo = function () {
            LayoutEditor.g_shapeList.removeShape(this.shape);
            LayoutEditor.g_shapeList.requestDraw(LayoutEditor.g_drawCtx);
            // what do we set the property panel to display?
        };
        return ShapeCommand;
    })();
    LayoutEditor.ShapeCommand = ShapeCommand;

    var RectCommand = (function (_super) {
        __extends(RectCommand, _super);
        function RectCommand(cx, cy, w, h) {
            _super.call(this);

            this.shape = new LayoutEditor.RectShape(w, h);
            this.shape.transform.translate.x = cx;
            this.shape.transform.translate.y = cy;
            this.shape.setStyle(LayoutEditor.g_style);
            this.shape.calculateBounds();
        }
        return RectCommand;
    })(ShapeCommand);
    LayoutEditor.RectCommand = RectCommand;

    var EllipseCommand = (function (_super) {
        __extends(EllipseCommand, _super);
        function EllipseCommand(cx, cy, rx, ry) {
            _super.call(this);

            this.shape = new LayoutEditor.EllipseShape(rx, ry);
            this.shape.transform.translate.x = cx;
            this.shape.transform.translate.y = cy;
            this.shape.setStyle(LayoutEditor.g_style);
            this.shape.calculateBounds();
        }
        return EllipseCommand;
    })(ShapeCommand);
    LayoutEditor.EllipseCommand = EllipseCommand;

    var TransformCommand = (function () {
        function TransformCommand(shape, transform) {
            this.shape = shape;
            this.transform = transform;
            this.originalTransform = new LayoutEditor.Transform();
            Helper.extend(this.originalTransform, shape.transform);
        }
        TransformCommand.prototype.redo = function () {
            Helper.extend(this.shape.transform, this.transform);
            this.shape.calculateBounds();
            LayoutEditor.g_shapeList.requestDraw(LayoutEditor.g_drawCtx);
        };

        TransformCommand.prototype.undo = function () {
            Helper.extend(this.shape.transform, this.originalTransform);
            this.shape.calculateBounds();
            LayoutEditor.g_shapeList.requestDraw(LayoutEditor.g_drawCtx);
        };
        return TransformCommand;
    })();
    LayoutEditor.TransformCommand = TransformCommand;

    var TextCommand = (function () {
        function TextCommand(shape, text) {
            this.shape = shape;
            this.text = text;
            this.oldText = this.shape.text;
        }
        TextCommand.prototype.redo = function () {
            this.shape.text = this.text;
            LayoutEditor.g_shapeList.requestDraw(LayoutEditor.g_drawCtx);
        };

        TextCommand.prototype.undo = function () {
            this.shape.text = this.oldText;
            LayoutEditor.g_shapeList.requestDraw(LayoutEditor.g_drawCtx);
        };
        return TextCommand;
    })();
    LayoutEditor.TextCommand = TextCommand;

    var PropertyCommand = (function () {
        function PropertyCommand(propertyInfo, value) {
            this.propertyInfo = propertyInfo;
            this.value = value;
            this.oldValue = propertyInfo.object[propertyInfo.name].toString();
        }
        PropertyCommand.prototype.redo = function () {
            this.setValue(this.value);
            LayoutEditor.g_shapeList.requestDraw(LayoutEditor.g_drawCtx);
        };

        PropertyCommand.prototype.undo = function () {
            this.setValue(this.oldValue);
            LayoutEditor.g_shapeList.requestDraw(LayoutEditor.g_drawCtx);
        };

        PropertyCommand.prototype.setValue = function (value) {
            var propertyInfo = this.propertyInfo;
            var type = typeof propertyInfo.object[propertyInfo.name];
            if (type === "number")
                propertyInfo.object[propertyInfo.name] = parseInt(value);
            else if (type === "string")
                propertyInfo.object[propertyInfo.name] = value;
            else
                Helper.assert(false); // can't handle this type
        };
        return PropertyCommand;
    })();
    LayoutEditor.PropertyCommand = PropertyCommand;

    LayoutEditor.g_drawCtx = null;
})(LayoutEditor || (LayoutEditor = {}));
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    

    var DrawTool = (function () {
        function DrawTool() {
            this.shape = null;
            this.canUse = false;
        }
        DrawTool.prototype.clear = function () {
            LayoutEditor.g_toolCtx.clearRect(0, 0, LayoutEditor.g_toolCtx.canvas.width, LayoutEditor.g_toolCtx.canvas.height);
        };

        DrawTool.prototype.draw = function () {
            this.clear();
            this.shape.calculateBounds();
            this.shape.draw(LayoutEditor.g_toolCtx);
        };

        DrawTool.prototype.onPointer = function (e) {
            return false;
        };

        DrawTool.prototype.onChangeFocus = function (focus) {
        };
        return DrawTool;
    })();
    LayoutEditor.DrawTool = DrawTool;

    var RectTool = (function (_super) {
        __extends(RectTool, _super);
        function RectTool() {
            _super.call(this);
            this.rectShape = new LayoutEditor.RectShape(0, 0);
            this.x1 = -1;
            this.y1 = -1;
            this.x2 = -1;
            this.y2 = -1;
            this.shape = this.rectShape;
            this.rectShape.style = LayoutEditor.g_drawStyle;
        }
        RectTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 1 /* Start */:
                    LayoutEditor.g_grid.rebuildTabs();
                    var pos = LayoutEditor.g_grid.snapXY(e.x, e.y);
                    this.x1 = pos.x;
                    this.y1 = pos.y;
                    isHandled = true;
                    break;

                case 2 /* Move */:
                    var pos = LayoutEditor.g_grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
                    this.canUse = true;
                    this.drawRect();

                    isHandled = true;
                    break;

                case 3 /* End */:
                    this.clear();
                    if (this.canUse) {
                        var newCommand = new LayoutEditor.RectCommand(this.rectShape.transform.translate.x, this.rectShape.transform.translate.y, this.rectShape.w, this.rectShape.h);
                        LayoutEditor.g_commandList.addCommand(newCommand);
                        this.canUse = false;
                    }

                    isHandled = true;
                    break;
            }
            return isHandled;
        };

        RectTool.prototype.drawRect = function () {
            this.rectShape.fromRect(Math.min(this.x1, this.x2), Math.min(this.y1, this.y2), Math.abs(this.x2 - this.x1), Math.abs(this.y2 - this.y1));

            this.draw();

            if (LayoutEditor.g_grid.snappedX > -1 || LayoutEditor.g_grid.snappedY > -1) {
                LayoutEditor.g_toolCtx.save();
                LayoutEditor.g_panZoom.transform(LayoutEditor.g_toolCtx);
                LayoutEditor.g_toolCtx.beginPath();
                LayoutEditor.g_snapStyle.draw(LayoutEditor.g_toolCtx);
                LayoutEditor.g_toolCtx.moveTo(LayoutEditor.g_grid.snappedX, 0);
                LayoutEditor.g_toolCtx.lineTo(LayoutEditor.g_grid.snappedX, 1000);
                LayoutEditor.g_toolCtx.moveTo(0, LayoutEditor.g_grid.snappedY);
                LayoutEditor.g_toolCtx.lineTo(1000, LayoutEditor.g_grid.snappedY);
                LayoutEditor.g_toolCtx.stroke();
                LayoutEditor.g_toolCtx.restore();
            }
        };
        return RectTool;
    })(DrawTool);
    LayoutEditor.RectTool = RectTool;

    var EllipseTool = (function (_super) {
        __extends(EllipseTool, _super);
        function EllipseTool() {
            _super.call(this);
            this.ellipseShape = new LayoutEditor.EllipseShape(0, 0);
            this.shape = this.ellipseShape;
            this.ellipseShape.style = LayoutEditor.g_drawStyle;
        }
        EllipseTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 1 /* Start */:
                    LayoutEditor.g_grid.rebuildTabs();
                    var pos = LayoutEditor.g_grid.snapXY(e.x, e.y);
                    this.x1 = pos.x;
                    this.y1 = pos.y;
                    isHandled = true;
                    break;
                case 2 /* Move */:
                    var pos = LayoutEditor.g_grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
                    this.canUse = true;
                    this.drawEllipse();
                    isHandled = true;
                    break;
                case 3 /* End */:
                    this.clear();
                    if (this.canUse) {
                        var newCommand = new LayoutEditor.EllipseCommand(this.ellipseShape.transform.translate.x, this.ellipseShape.transform.translate.y, this.ellipseShape.rx, this.ellipseShape.ry);
                        LayoutEditor.g_commandList.addCommand(newCommand);
                        this.canUse = false;
                    }
                    isHandled = true;
                    break;
            }

            return isHandled;
        };

        EllipseTool.prototype.drawEllipse = function () {
            this.ellipseShape.fromRect(Math.min(this.x1, this.x2), Math.min(this.y1, this.y2), Math.abs(this.x2 - this.x1), Math.abs(this.y2 - this.y1));
            this.draw();

            if (LayoutEditor.g_grid.snappedX > -1 || LayoutEditor.g_grid.snappedY > -1) {
                LayoutEditor.g_toolCtx.save();
                LayoutEditor.g_panZoom.transform(LayoutEditor.g_toolCtx);
                LayoutEditor.g_toolCtx.beginPath();
                LayoutEditor.g_snapStyle.draw(LayoutEditor.g_toolCtx);
                LayoutEditor.g_toolCtx.moveTo(LayoutEditor.g_grid.snappedX, 0);
                LayoutEditor.g_toolCtx.lineTo(LayoutEditor.g_grid.snappedX, 1000);
                LayoutEditor.g_toolCtx.moveTo(0, LayoutEditor.g_grid.snappedY);
                LayoutEditor.g_toolCtx.lineTo(1000, LayoutEditor.g_grid.snappedY);
                LayoutEditor.g_toolCtx.stroke();
                LayoutEditor.g_toolCtx.restore();
            }
        };
        return EllipseTool;
    })(DrawTool);
    LayoutEditor.EllipseTool = EllipseTool;

    var SelectTool = (function () {
        function SelectTool() {
            this.aabbShape = new LayoutEditor.AABBShape();
            this.aabbShape.style = LayoutEditor.g_selectStyle;
        }
        SelectTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 1 /* Start */:
                    this.aabbShape.x1 = e.x;
                    this.aabbShape.y1 = e.y;
                    this.aabbShape.x2 = e.x;
                    this.aabbShape.y2 = e.y;
                    this.aabbShape.calculateBounds();
                    isHandled = true;
                    break;
                case 2 /* Move */:
                    this.aabbShape.x2 = e.x;
                    this.aabbShape.y2 = e.y;
                    this.aabbShape.calculateBounds();
                    this.drawSelect();
                    isHandled = true;
                    break;
                case 3 /* End */:
                    this.clear();
                    var shapes = LayoutEditor.g_shapeList.getShapesInBounds(this.aabbShape.aabb);
                    if (shapes.length > 0)
                        LayoutEditor.g_commandList.addCommand(new SelectCommand(shapes));
                    isHandled = true;
                    break;
            }

            return isHandled;
        };

        SelectTool.prototype.onChangeFocus = function (focus) {
        };

        SelectTool.prototype.clear = function () {
            LayoutEditor.g_toolCtx.clearRect(0, 0, LayoutEditor.g_toolCtx.canvas.width, LayoutEditor.g_toolCtx.canvas.height);
        };

        SelectTool.prototype.drawSelect = function () {
            this.clear();

            this.aabbShape.draw(LayoutEditor.g_toolCtx);

            LayoutEditor.g_shapeList.selectedStyle.draw(LayoutEditor.g_toolCtx);
            var shapes = LayoutEditor.g_shapeList.getShapesInBounds(this.aabbShape.aabb);
            for (var i = 0; i < shapes.length; ++i) {
                shapes[i].drawSelect(LayoutEditor.g_toolCtx);
            }
        };
        return SelectTool;
    })();
    LayoutEditor.SelectTool = SelectTool;

    var ResizeTool = (function () {
        function ResizeTool() {
            this.resizeShape = null;
            this.shape = null;
            this.handle = 0 /* None */;
            this.handleSize = 20;
            this.canUse = false;
            this.startLocalPos = null;
        }
        ResizeTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 1 /* Start */:
                    this.shape = LayoutEditor.g_shapeList.getShapeInXY(e.x, e.y);
                    this.handle = 0 /* None */;

                    if (this.shape) {
                        LayoutEditor.g_grid.rebuildTabs();
                        this.resizeShape = this.shape.copy();
                        this.resizeShape.style = LayoutEditor.g_selectStyle;

                        var oldOABB = this.shape.oabb;
                        var localPos = oldOABB.invXY(e.x, e.y);
                        var handleX = this.handleSize;
                        var handleY = this.handleSize;

                        if (localPos.x + oldOABB.hw < handleX)
                            this.handle = (this.handle | 1 /* Left */);
                        else if (oldOABB.hw - localPos.x < handleX)
                            this.handle = (this.handle | 2 /* Right */);

                        if (localPos.y + oldOABB.hh < handleY)
                            this.handle = (this.handle | 4 /* Top */);
                        else if (oldOABB.hh - localPos.y < handleY)
                            this.handle = (this.handle | 8 /* Bottom */);

                        if (this.handle === 0 /* None */)
                            this.handle = 16 /* Middle */;

                        this.startLocalPos = localPos;
                        isHandled = true;
                    }
                    break;

                case 2 /* Move */:
                    if (this.shape) {
                        var transform = this.resizeShape.transform;
                        var oldTransform = this.shape.transform;
                        var oldOABB = this.shape.oabb;

                        var localPos = oldOABB.invXY(e.x, e.y);
                        var dx = (localPos.x - this.startLocalPos.x);
                        var dy = (localPos.y - this.startLocalPos.y);
                        var sx = dx * oldTransform.scale.x / (oldOABB.hw * 2);
                        var sy = dy * oldTransform.scale.y / (oldOABB.hh * 2);
                        var cr = Math.cos(oldOABB.rotate);
                        var sr = Math.sin(oldOABB.rotate);

                        var newX = oldTransform.translate.x;
                        var newY = oldTransform.translate.y;
                        if (this.handle & 1 /* Left */) {
                            newX += dx * cr * 0.5;
                            newY += dx * sr * 0.5;
                            transform.scale.x = oldTransform.scale.x - sx;
                        } else if (this.handle & 2 /* Right */) {
                            newX += dx * cr * 0.5;
                            newY += dx * sr * 0.5;
                            transform.scale.x = oldTransform.scale.x + sx;
                        }

                        if (this.handle & 4 /* Top */) {
                            newX -= dy * sr * 0.5;
                            newY += dy * cr * 0.5;
                            transform.scale.y = oldTransform.scale.y - sy;
                        } else if (this.handle & 8 /* Bottom */) {
                            newX -= dy * sr * 0.5;
                            newY += dy * cr * 0.5;
                            transform.scale.y = oldTransform.scale.y + sy;
                        }

                        if (this.handle === 16 /* Middle */) {
                            transform.translate.x += e.deltaX;
                            transform.translate.y += e.deltaY;
                        } else {
                            transform.translate.x = newX;
                            transform.translate.y = newY;
                        }

                        this.canUse = this.handle !== 0 /* None */;
                        this.drawResize();
                        isHandled = true;
                    }
                    break;

                case 3 /* End */:
                    if (this.shape && this.canUse) {
                        var newCommand = new LayoutEditor.TransformCommand(this.shape, this.resizeShape.transform);
                        LayoutEditor.g_commandList.addCommand(newCommand);
                        isHandled = true;
                    }
                    this.clear();
                    this.canUse = false;
                    this.shape = null;
                    break;
            }

            return isHandled;
        };

        ResizeTool.prototype.onChangeFocus = function (focus) {
        };

        ResizeTool.prototype.clear = function () {
            LayoutEditor.g_toolCtx.clearRect(0, 0, LayoutEditor.g_toolCtx.canvas.width, LayoutEditor.g_toolCtx.canvas.height);
        };

        ResizeTool.prototype.drawResize = function () {
            this.clear();

            this.resizeShape.draw(LayoutEditor.g_toolCtx);
        };
        return ResizeTool;
    })();
    LayoutEditor.ResizeTool = ResizeTool;

    (function (ResizeTool) {
        (function (HandleFlag) {
            HandleFlag[HandleFlag["None"] = 0] = "None";
            HandleFlag[HandleFlag["Left"] = 1] = "Left";
            HandleFlag[HandleFlag["Right"] = 2] = "Right";
            HandleFlag[HandleFlag["Top"] = 4] = "Top";
            HandleFlag[HandleFlag["Bottom"] = 8] = "Bottom";
            HandleFlag[HandleFlag["Middle"] = 16] = "Middle";
        })(ResizeTool.HandleFlag || (ResizeTool.HandleFlag = {}));
        var HandleFlag = ResizeTool.HandleFlag;
        ;
    })(LayoutEditor.ResizeTool || (LayoutEditor.ResizeTool = {}));
    var ResizeTool = LayoutEditor.ResizeTool;

    var RotateTool = (function () {
        function RotateTool() {
            this.shape = null;
            this.lastAngle = 0;
            this.rotateShape = null;
            this.pivot = {
                x: 0,
                y: 0
            };
        }
        RotateTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 1 /* Start */:
                    this.shape = LayoutEditor.g_shapeList.getShapeInXY(e.x, e.y);
                    if (this.shape) {
                        this.rotateShape = this.shape.copy();
                        this.rotateShape.style = LayoutEditor.g_selectStyle;
                        this.pivot = this.rotateShape.transform.translate;
                        this.lastAngle = this.getAngle(e.x, e.y, this.pivot);
                        isHandled = true;
                    }
                    break;

                case 2 /* Move */:
                    if (this.rotateShape) {
                        var newAngle = this.getAngle(e.x, e.y, this.pivot);
                        this.rotateShape.transform.rotate += newAngle - this.lastAngle;
                        this.lastAngle = newAngle;
                        this.drawRotate();
                        isHandled = true;
                    }
                    break;

                case 3 /* End */:
                    if (this.rotateShape) {
                        var newCommand = new LayoutEditor.TransformCommand(this.shape, this.rotateShape.transform);
                        LayoutEditor.g_commandList.addCommand(newCommand);
                        isHandled = true;
                    }

                    this.clear();
                    this.rotateShape = null;
                    this.shape = null;
                    break;
            }

            return isHandled;
        };

        RotateTool.prototype.onChangeFocus = function (focus) {
        };

        RotateTool.prototype.clear = function () {
            LayoutEditor.g_toolCtx.clearRect(0, 0, LayoutEditor.g_toolCtx.canvas.width, LayoutEditor.g_toolCtx.canvas.height);
        };

        RotateTool.prototype.drawRotate = function () {
            this.clear();

            this.rotateShape.calculateBounds();
            this.rotateShape.draw(LayoutEditor.g_toolCtx);
        };

        RotateTool.prototype.getAngle = function (x, y, pivot) {
            var dy = y - pivot.y;
            var dx = x - pivot.x;
            if (Math.abs(dy) < LayoutEditor.EPSILON && Math.abs(dx) < LayoutEditor.EPSILON)
                return 0;

            return Math.atan2(dy, dx);
        };
        return RotateTool;
    })();
    LayoutEditor.RotateTool = RotateTool;

    var MoveTool = (function () {
        function MoveTool() {
            this.moveShape = null;
            this.shape = null;
            this.canUse = false;
            this.deltaX = 0;
            this.deltaY = 0;
            this.snappedX = 0;
            this.snappedY = 0;
        }
        MoveTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 1 /* Start */:
                    this.shape = LayoutEditor.g_shapeList.getShapeInXY(e.x, e.y);

                    if (this.shape) {
                        LayoutEditor.g_grid.rebuildTabs();
                        this.moveShape = this.shape.copy();
                        this.moveShape.style = LayoutEditor.g_selectStyle;
                        this.deltaX = 0;
                        this.deltaY = 0;
                        isHandled = true;
                    }
                    break;

                case 2 /* Move */:
                    if (this.shape) {
                        var transform = this.moveShape.transform;
                        var oldTransform = this.shape.transform;

                        this.deltaX += e.deltaX;
                        this.deltaY += e.deltaY;
                        transform.translate.x = oldTransform.translate.x + this.deltaX;
                        transform.translate.y = oldTransform.translate.y + this.deltaY;

                        this.snapAABBToGrid();
                        this.canUse = true;
                        this.drawMove();
                        isHandled = true;
                    }
                    break;

                case 3 /* End */:
                    if (this.shape && this.canUse) {
                        var newCommand = new LayoutEditor.TransformCommand(this.shape, this.moveShape.transform);
                        LayoutEditor.g_commandList.addCommand(newCommand);
                        isHandled = true;
                    }
                    this.canUse = false;
                    this.shape = null;
                    break;
            }

            return isHandled;
        };

        MoveTool.prototype.onChangeFocus = function (focus) {
        };

        MoveTool.prototype.clear = function () {
            LayoutEditor.g_toolCtx.clearRect(0, 0, LayoutEditor.g_toolCtx.canvas.width, LayoutEditor.g_toolCtx.canvas.height);
        };

        MoveTool.prototype.drawMove = function () {
            this.clear();

            this.moveShape.draw(LayoutEditor.g_toolCtx);
            LayoutEditor.g_toolCtx.strokeStyle = "orange";
            this.moveShape.drawSelect(LayoutEditor.g_toolCtx);
            LayoutEditor.g_toolCtx.strokeStyle = "violet";
            this.moveShape.drawAABB(LayoutEditor.g_toolCtx);

            if (this.snappedX > -1 || this.snappedY > -1) {
                LayoutEditor.g_toolCtx.save();
                LayoutEditor.g_panZoom.transform(LayoutEditor.g_toolCtx);
                LayoutEditor.g_toolCtx.beginPath();
                LayoutEditor.g_snapStyle.draw(LayoutEditor.g_toolCtx);
                LayoutEditor.g_toolCtx.moveTo(this.snappedX, 0);
                LayoutEditor.g_toolCtx.lineTo(this.snappedX, 1000);
                LayoutEditor.g_toolCtx.moveTo(0, this.snappedY);
                LayoutEditor.g_toolCtx.lineTo(1000, this.snappedY);
                LayoutEditor.g_toolCtx.stroke();
                LayoutEditor.g_toolCtx.restore();
            }
        };

        MoveTool.prototype.snapAABBToGrid = function () {
            this.moveShape.calculateBounds();

            var aabb = this.moveShape.aabb;
            var translate = this.moveShape.transform.translate;

            var left = aabb.cx - aabb.hw;
            var top = aabb.cy - aabb.hh;
            var right = aabb.cx + aabb.hw;
            var bottom = aabb.cy + aabb.hh;

            var snapTopLeft = LayoutEditor.g_grid.snapXY(left, top);
            var snapBottomRight = LayoutEditor.g_grid.snapXY(right, bottom);
            var snapCenter = LayoutEditor.g_grid.snapXY(aabb.cx, aabb.cy);

            this.snappedX = -1;
            if (left !== snapTopLeft.x) {
                translate.x += snapTopLeft.x - left;
                this.snappedX = snapTopLeft.x;
            } else if (right !== snapBottomRight.x) {
                translate.x += snapBottomRight.x - right;
                this.snappedX = snapBottomRight.x;
            } else if (aabb.cx !== snapCenter.x) {
                translate.x += snapCenter.x - aabb.cx;
                this.snappedX = snapCenter.x;
            }

            this.snappedY = -1;
            if (top !== snapTopLeft.y) {
                translate.y += snapTopLeft.y - top;
                this.snappedY = snapTopLeft.y;
            } else if (bottom !== snapBottomRight.y) {
                translate.y += snapBottomRight.y - bottom;
                this.snappedY = snapBottomRight.y;
            } else if (aabb.cy !== snapCenter.y) {
                translate.y += snapCenter.y - aabb.cy;
                this.snappedY = snapCenter.y;
            }

            if (this.snappedY >= 1 || this.snappedX >= -1)
                this.moveShape.calculateBounds();
        };
        return MoveTool;
    })();
    LayoutEditor.MoveTool = MoveTool;

    var PanZoomTool = (function () {
        function PanZoomTool() {
        }
        PanZoomTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 1 /* Start */:
                    break;

                case 2 /* Move */:
                    LayoutEditor.g_panZoom.pan.x += LayoutEditor.g_panZoom.deltaX;
                    LayoutEditor.g_panZoom.pan.y += LayoutEditor.g_panZoom.deltaY;
                    this.drawPanZoom();
                    isHandled = true;
                    break;

                case 6 /* MouseWheel */:
                    var scale = (LayoutEditor.g_panZoom.deltaY > 0 ? 0.5 : 2);
                    LayoutEditor.g_panZoom.pan.x += e.x * LayoutEditor.g_panZoom.zoom * (1 - scale);
                    LayoutEditor.g_panZoom.pan.y += e.y * LayoutEditor.g_panZoom.zoom * (1 - scale);
                    LayoutEditor.g_panZoom.zoom *= scale;

                    this.drawPanZoom();
                    isHandled = true;
                    break;

                case 3 /* End */:
                    break;
            }

            return isHandled;
        };

        PanZoomTool.prototype.onChangeFocus = function (focus) {
        };

        PanZoomTool.prototype.drawPanZoom = function () {
            LayoutEditor.g_shapeList.requestDraw(LayoutEditor.g_drawCtx);
        };
        return PanZoomTool;
    })();
    LayoutEditor.PanZoomTool = PanZoomTool;

    var TextTool = (function () {
        function TextTool() {
            this.shape = null;
            this.editShape = null;
            this.inputListener = null;
            var self = this;
            LayoutEditor.g_inputMultiLine.addEventListener('input', function (e) {
                self.onInput(e);
            });
        }
        TextTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 4 /* DoubleClick */:
                    this.shape = LayoutEditor.g_shapeList.getShapeInXY(e.x, e.y);
                    if (this.shape) {
                        this.editShape = this.shape.copy();
                        LayoutEditor.g_inputMultiLine.value = this.editShape.text;
                        LayoutEditor.g_inputMultiLine.focus();
                        isHandled = true;
                    }
                    break;

                case 1 /* Start */:
                    if (this.shape && LayoutEditor.g_shapeList.getShapeInXY(e.x, e.y) !== this.shape) {
                        this.stopTool();
                        isHandled = true;
                    }
            }

            return isHandled;
        };

        TextTool.prototype.onChangeFocus = function (focus) {
            if (this.shape)
                this.stopTool();
        };

        TextTool.prototype.stopTool = function () {
            if (this.shape) {
                var newCommand = new LayoutEditor.TextCommand(this.shape, this.editShape.text);
                LayoutEditor.g_commandList.addCommand(newCommand);
                this.shape = null;
                LayoutEditor.g_inputMultiLine.value = "";
            }
        };

        TextTool.prototype.clear = function () {
            LayoutEditor.g_toolCtx.clearRect(0, 0, LayoutEditor.g_toolCtx.canvas.width, LayoutEditor.g_toolCtx.canvas.height);
        };

        TextTool.prototype.onInput = function (e) {
            if (this.shape === null)
                return;

            this.editShape.text = LayoutEditor.g_inputMultiLine.value;
            this.drawPanZoom();
        };

        TextTool.prototype.drawPanZoom = function () {
            this.clear();

            this.editShape.draw(LayoutEditor.g_toolCtx);
        };
        return TextTool;
    })();
    LayoutEditor.TextTool = TextTool;

    var PropertyTool = (function () {
        function PropertyTool() {
            this.editing = null;
            var self = this;
            LayoutEditor.g_inputText.addEventListener("input", function (e) {
                self.onInput(e);
            });
            LayoutEditor.g_inputText.addEventListener("change", function (e) {
                self.onChange(e);
            });
        }
        PropertyTool.prototype.onPointer = function (e) {
            var canvasWidth = LayoutEditor.g_propertyCtx.canvas.width;
            var panelWidth = LayoutEditor.g_propertyPanel.width;

            switch (e.state) {
                case 1 /* Start */:
                    if (e.x < canvasWidth - panelWidth || e.x >= canvasWidth) {
                        this.edit(null);
                        break;
                    }

                    var info = LayoutEditor.g_propertyPanel.getPropertyInfoXY(e.x, e.y);
                    this.edit(info);
                    break;
            }

            return this.editing !== null;
        };

        PropertyTool.prototype.onChangeFocus = function (name) {
        };

        PropertyTool.prototype.onInput = function (e) {
            if (this.editing)
                LayoutEditor.g_propertyPanel.drawEditing(this.editing, LayoutEditor.g_inputText.value);
        };

        PropertyTool.prototype.onChange = function (e) {
            if (this.editing)
                this.edit(null); // finished
        };

        PropertyTool.prototype.edit = function (propertyInfo) {
            if (this.editing === propertyInfo)
                return;

            if (this.editing) {
                var newCommand = new LayoutEditor.PropertyCommand(this.editing, LayoutEditor.g_inputText.value);
                LayoutEditor.g_commandList.addCommand(newCommand);
            }

            this.editing = propertyInfo;

            if (propertyInfo) {
                LayoutEditor.g_inputText.value = propertyInfo.object[propertyInfo.name];
                LayoutEditor.g_propertyPanel.drawEditing(propertyInfo, LayoutEditor.g_inputText.value);
                LayoutEditor.g_inputText.focus();
            }
        };
        return PropertyTool;
    })();
    LayoutEditor.PropertyTool = PropertyTool;

    // TODO Should we be able to undo selection?????
    var SelectCommand = (function () {
        function SelectCommand(shapes) {
            this.shapes = shapes;
            this.selectedShapes = [];
            this.selectedShapes = LayoutEditor.g_shapeList.getSelectedShapes().slice();
        }
        SelectCommand.prototype.redo = function () {
            LayoutEditor.g_shapeList.setSelectedShapes(this.selectedShapes);
            LayoutEditor.g_shapeList.toggleSelected(this.shapes);
            LayoutEditor.g_shapeList.requestDrawSelect(LayoutEditor.g_toolCtx);
        };

        SelectCommand.prototype.undo = function () {
            LayoutEditor.g_shapeList.setSelectedShapes(this.selectedShapes);
            LayoutEditor.g_shapeList.requestDrawSelect(LayoutEditor.g_toolCtx);
        };
        return SelectCommand;
    })();
    LayoutEditor.SelectCommand = SelectCommand;

    LayoutEditor.g_toolCtx = null;
    LayoutEditor.g_inputText = null;
    LayoutEditor.g_inputMultiLine = null;
})(LayoutEditor || (LayoutEditor = {}));
/// <reference path="interactionhelper.ts" />
/// <reference path="helper.ts" />
/// <reference path="system.ts" />
/// <reference path="property.ts" />
/// <reference path="style.ts" />
/// <reference path="panzoom.ts" />
/// <reference path="shape.ts" />
/// <reference path="grid.ts" />
/// <reference path="command.ts" />
/// <reference path="tool.ts" />
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    "use strict";

    var g_tool = null;
    var g_propertyTool = null;

    function setTool(toolName) {
        var oldTool = g_tool;
        switch (toolName) {
            case "selectTool":
                g_tool = new LayoutEditor.SelectTool();
                break;

            case "resizeTool":
                g_tool = new LayoutEditor.ResizeTool();
                break;

            case "moveTool":
                g_tool = new LayoutEditor.MoveTool();
                break;

            case "rectTool":
                g_tool = new LayoutEditor.RectTool();
                break;

            case "ellipseTool":
                g_tool = new LayoutEditor.EllipseTool();
                break;

            case "rotateTool":
                g_tool = new LayoutEditor.RotateTool();
                break;

            case "panZoomTool":
                g_tool = new LayoutEditor.PanZoomTool();
                break;

            case "textTool":
                g_tool = new LayoutEditor.TextTool();
                break;
        }

        if (g_tool !== oldTool) {
            console.log("Changed tool to: " + toolName);
        }
    }

    //------------------------------
    function toolButtonClick(e) {
        setTool(e.target.id);
    }

    function saveData() {
        var obj = {
            styleList: LayoutEditor.g_styleList.saveData(),
            shapeList: LayoutEditor.g_shapeList.saveData(),
            panZoom: LayoutEditor.g_panZoom.saveData()
        };
        localStorage['layouteditor'] = JSON.stringify(obj);
    }

    function loadData() {
        var obj = JSON.parse(localStorage['layouteditor']);
        reset();
        LayoutEditor.g_styleList.loadData(obj.styleList);
        LayoutEditor.g_shapeList.loadData(obj.shapeList);
        LayoutEditor.g_panZoom.loadData(obj.panZoom);
    }

    function reset() {
        LayoutEditor.g_commandList.reset();
        LayoutEditor.g_shapeList.reset();
        LayoutEditor.g_shapeList.requestDraw(LayoutEditor.g_drawCtx);
        LayoutEditor.g_panZoom.reset();
        LayoutEditor.g_styleList.reset();
    }

    var focus = "";

    function setFocus(name) {
        if (focus === name)
            return;

        focus = name;
        g_tool.onChangeFocus(name); // TODO make more general
    }

    window.addEventListener("load", function () {
        var canvas = document.getElementById("layoutbase");
        var toolCanvas = document.getElementById("layouttool");
        var propertyCanvas = document.getElementById("property");
        var interactionCanvas = document.getElementById("interaction");

        LayoutEditor.g_drawCtx = canvas.getContext("2d");
        LayoutEditor.g_toolCtx = toolCanvas.getContext("2d");
        LayoutEditor.g_propertyCtx = propertyCanvas.getContext("2d");

        var toolElems = document.querySelectorAll(".tool");
        for (var i = 0; i < toolElems.length; ++i) {
            toolElems[i].addEventListener("click", toolButtonClick);
        }

        document.getElementById("undo").addEventListener("click", function () {
            LayoutEditor.g_commandList.undo();
        });
        document.getElementById("redo").addEventListener("click", function () {
            LayoutEditor.g_commandList.redo();
        });
        document.getElementById("clear").addEventListener("click", reset);
        document.getElementById("save").addEventListener("click", saveData);
        document.getElementById("load").addEventListener("click", loadData);

        LayoutEditor.g_inputText = document.getElementById("inputText");
        LayoutEditor.g_inputMultiLine = document.getElementById("inputMultiLine");

        g_propertyTool = new LayoutEditor.PropertyTool();

        setTool("rectTool");

        var watchCanvas = new InteractionHelper.Watch(interactionCanvas, function (e) {
            LayoutEditor.g_panZoom.x = e.x;
            LayoutEditor.g_panZoom.y = e.y;
            LayoutEditor.g_panZoom.deltaX = e.deltaX;
            LayoutEditor.g_panZoom.deltaY = e.deltaY;
            LayoutEditor.g_panZoom.pinchDistance = e.pinchDistance;

            e.x = LayoutEditor.g_panZoom.toX(e.x);
            e.y = LayoutEditor.g_panZoom.toY(e.y);
            e.deltaX = LayoutEditor.g_panZoom.toW(e.deltaX);
            e.deltaY = LayoutEditor.g_panZoom.toH(e.deltaY);
            e.pinchDistance *= LayoutEditor.g_panZoom.zoom;

            var panels = [
                {
                    name: "Property",
                    code: g_propertyTool
                }, {
                    name: "Tool",
                    code: g_tool
                }];
            for (var i = 0; i < panels.length; ++i) {
                var panel = panels[i];
                if (panel.code.onPointer(e)) {
                    setFocus(panel.name);
                    break;
                }
            }
        });
    });
})(LayoutEditor || (LayoutEditor = {}));
