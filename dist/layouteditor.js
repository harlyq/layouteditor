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

            var pinch = this.getPinchInfo(e);

            if (this.moveStarted || Math.abs(pinch.x - this.lastX) > this.options.TouchCancelTapDistance || Math.abs(pinch.y - this.lastY) > this.options.TouchCancelTapDistance) {
                this.moveStarted = true;

                var event = new Event();
                event.x = pinch.x;
                event.y = pinch.y;
                event.deltaX = pinch.x - this.lastX;
                event.deltaY = pinch.y - this.lastY;
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

            var pinch = this.getPinchInfo(e);

            var event = new Event();
            event.x = pinch.x;
            event.y = pinch.y;
            event.deltaX = pinch.x - this.lastX;
            event.deltaY = pinch.y - this.lastY;
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

    

    LayoutEditor.g_draw = null;
})(LayoutEditor || (LayoutEditor = {}));
/// <reference path='_dependencies.ts' />
var LayoutEditor;
(function (LayoutEditor) {
    var PropertyBinding = (function () {
        function PropertyBinding(object, prop) {
            this.object = object;
            this.prop = prop;
            this.elem = null;
            this.state = "";
            this.editor = null;
        }
        return PropertyBinding;
    })();
    LayoutEditor.PropertyBinding = PropertyBinding;

    var WebPropertyPanel = (function () {
        function WebPropertyPanel() {
            this.object = null;
            this.propertyLists = [];
            this.width = 0;
            this.rootElem = null;
            this.editing = null;
            this.clickHandler = null;
            this.bindings = [];
            this.editors = [];
            var self = this;
            this.clickHandler = function (e) {
                self.onClick(e);
            };
        }
        WebPropertyPanel.prototype.setRootElem = function (rootElem) {
            if (this.rootElem) {
                this.rootElem.removeEventListener('click', this.clickHandler);
            }

            this.rootElem = rootElem;
            this.rootElem.addEventListener('click', this.clickHandler);
        };

        WebPropertyPanel.prototype.setObject = function (obj) {
            if (this.object !== obj) {
                this.object = obj;
                this.bindings.length = 0;

                var rootElem = this.rootElem;
                while (rootElem.lastChild) {
                    rootElem.removeChild(rootElem.lastChild);
                }

                this.createBinding(obj, "", "object", this.rootElem);
            }

            this.refresh();
        };

        WebPropertyPanel.prototype.addPropertyList = function (propertyList) {
            this.propertyLists.push(propertyList);
        };

        WebPropertyPanel.prototype.getPropertyList = function (obj) {
            for (var i = this.propertyLists.length - 1; i >= 0; --i) {
                if (this.propertyLists[i].canHandle(obj))
                    return this.propertyLists[i];
            }
        };

        WebPropertyPanel.prototype.refresh = function () {
            for (var i = 0; i < this.bindings.length; ++i) {
                var binding = this.bindings[i];
                binding.editor.refresh(binding);
            }
        };

        WebPropertyPanel.prototype.onClick = function (e) {
            var elem = e.target;
            var idString = "";
            while (elem && !elem.hasAttribute('data-id'))
                elem = elem.parentNode;

            if (!elem)
                return;

            var id = parseInt(elem.getAttribute('data-id'));
            var binding = this.bindings[id];
            if (binding) {
                this.startEditing(binding);
            }
        };

        WebPropertyPanel.prototype.startEditing = function (binding) {
            this.editing = binding;
            binding.editor.startEdit(binding);
        };

        WebPropertyPanel.prototype.commitEditing = function () {
            var binding = this.editing;
            if (!binding)
                return;

            binding.editor.commitEdit(binding);
        };

        WebPropertyPanel.prototype.postChange = function (binding) {
            LayoutEditor.g_draw(LayoutEditor.g_shapeList); // TODO tell client instead
        };

        WebPropertyPanel.prototype.addEditor = function (editor) {
            this.editors.push(editor);
        };

        WebPropertyPanel.prototype.createBinding = function (object, prop, editorType, parentElem) {
            var binding = new PropertyBinding(object, prop);
            this.bindings.push(binding);

            var id = this.bindings.length - 1;

            for (var i = this.editors.length - 1; i >= 0; --i) {
                var editor = this.editors[i];
                if (editor.canEdit(editorType)) {
                    var elem = editor.createElement(parentElem, binding);
                    binding.elem = elem;
                    binding.editor = editor;

                    if (elem)
                        elem.setAttribute('data-id', id.toString());
                    break;
                }
            }

            return binding;
        };
        return WebPropertyPanel;
    })();
    LayoutEditor.WebPropertyPanel = WebPropertyPanel;

    var TextPropertyEditor = (function () {
        function TextPropertyEditor() {
        }
        TextPropertyEditor.prototype.setInputElem = function (elem) {
            elem.classList.add('inputText');

            var self = this;
            elem.addEventListener("change", function (e) {
                self.onChange(e);
            });

            this.inputText = elem;
        };

        TextPropertyEditor.prototype.canEdit = function (type) {
            return type === "string" || type === "number";
        };

        TextPropertyEditor.prototype.createElement = function (parentElem, binding) {
            var textDiv = document.createElement('div');
            textDiv.classList.add('propertyText');
            var nameSpan = document.createElement('span');
            var valueSpan = document.createElement('span');

            nameSpan.innerHTML = binding.prop + ": ";

            textDiv.appendChild(nameSpan);
            textDiv.appendChild(valueSpan);

            binding.elem = textDiv;
            this.refresh(binding);

            parentElem.appendChild(textDiv);

            return textDiv;
        };

        TextPropertyEditor.prototype.refresh = function (binding) {
            binding.elem.lastChild.innerHTML = binding.object[binding.prop];
        };

        TextPropertyEditor.prototype.startEdit = function (binding) {
            var rectObject = binding.elem.lastChild.getBoundingClientRect();

            this.inputText.style.top = rectObject.top + 'px';
            this.inputText.style.left = rectObject.left + 'px';
            this.inputText.value = binding.object[binding.prop].toString();
            this.inputText.type = 'input';

            this.inputText.setSelectionRange(0, LayoutEditor.g_inputText.value.length);
            this.inputText.focus();
        };

        TextPropertyEditor.prototype.commitEdit = function (binding) {
            binding.object[binding.prop] = LayoutEditor.g_inputText.value;
            LayoutEditor.g_propertyPanel.postChange(binding);

            this.inputText.blur();
            this.inputText.type = 'hidden';

            this.refresh(binding);
        };

        TextPropertyEditor.prototype.onChange = function (e) {
            LayoutEditor.g_propertyPanel.commitEditing();
        };
        return TextPropertyEditor;
    })();
    LayoutEditor.TextPropertyEditor = TextPropertyEditor;

    var ObjectPropertyEditor = (function () {
        function ObjectPropertyEditor() {
        }
        ObjectPropertyEditor.prototype.canEdit = function (type) {
            return type === "object";
        };

        ObjectPropertyEditor.prototype.createElement = function (parentElem, binding) {
            var objectElem = null;
            var object = binding.object;

            if (binding.prop.length !== 0) {
                // this is a sub-element
                binding.state = 'closed';
                objectElem = document.createElement('div');
                objectElem.innerHTML = binding.prop;
                objectElem.classList.add('propertyObject');
                objectElem.setAttribute('data-state', binding.state);

                parentElem.appendChild(objectElem);
                parentElem = objectElem; // make this the new parent

                object = object[binding.prop]; // inspect the object in this property
            }

            var propertyList = LayoutEditor.g_propertyPanel.getPropertyList(object);

            for (var i = 0; i < propertyList.items.length; ++i) {
                var propItem = propertyList.items[i];
                var prop = propItem.prop;
                var type = propItem.type || typeof object[prop];

                LayoutEditor.g_propertyPanel.createBinding(object, prop, type, parentElem);
            }

            return objectElem;
        };

        ObjectPropertyEditor.prototype.refresh = function (binding) {
            // do nothing
        };

        ObjectPropertyEditor.prototype.startEdit = function (binding) {
            var wasOpen = (binding.elem.getAttribute('data-state') === 'open');
            binding.state = wasOpen ? 'closed' : 'open';
            binding.elem.setAttribute('data-state', binding.state);
        };

        ObjectPropertyEditor.prototype.commitEdit = function (binding) {
            // do nothing
        };
        return ObjectPropertyEditor;
    })();
    LayoutEditor.ObjectPropertyEditor = ObjectPropertyEditor;

    LayoutEditor.g_propertyPanel = new WebPropertyPanel();

    LayoutEditor.g_textPropertyEditor = new TextPropertyEditor();

    LayoutEditor.g_propertyPanel.addEditor(LayoutEditor.g_textPropertyEditor);
    LayoutEditor.g_propertyPanel.addEditor(new ObjectPropertyEditor());

    LayoutEditor.g_inputText = null;
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
        Style.prototype.drawShape = function (ctx) {
            if (ctx.strokeStyle !== this.strokeStyle)
                ctx.strokeStyle = this.strokeStyle;
            if (ctx.fillStyle !== this.fillStyle)
                ctx.fillStyle = this.fillStyle;
            if (ctx.lineWidth !== this.lineWidth.toString())
                ctx.lineWidth = this.lineWidth.toString();
            ctx.setLineDash(this.lineDash);
        };

        Style.prototype.drawFont = function (ctx) {
            if (ctx.textAlign !== this.textAlign)
                ctx.textAlign = this.textAlign;
            if (ctx.textBaseline !== this.textBaseline)
                ctx.textBaseline = this.textBaseline;
            if (ctx.fillStyle !== this.fontStyle)
                ctx.fillStyle = this.fontStyle;
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

    LayoutEditor.g_drawStyle.strokeStyle = "red";
    LayoutEditor.g_drawStyle.lineDash = [2, 2];
    LayoutEditor.g_selectStyle.strokeStyle = "blue";
    LayoutEditor.g_selectStyle.lineDash = [5, 5];
    LayoutEditor.g_selectStyle.fontStyle = "blue";
    LayoutEditor.g_snapStyle.strokeStyle = "red";

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

            var defaultStyle2 = new Style("default2");
            defaultStyle2.fillStyle = "none";
            defaultStyle2.lineWidth = 2;
            defaultStyle2.strokeStyle = "green";
            defaultStyle2.textAlign = "left";
            defaultStyle2.fontSize = 15;
            defaultStyle2.fontStyle = "green";

            this.styles.push(defaultStyle);
            this.styles.push(defaultStyle2);
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
        canHandle: function (obj) {
            return obj instanceof Style;
        },
        items: [
            {
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
})(LayoutEditor || (LayoutEditor = {}));
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    //------------------------------
    var PanZoom = (function () {
        function PanZoom() {
            this.panX = 0;
            this.panY = 0;
            this.zoom = 1;
            // raw input values, prior to panZoom scaling
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
            return (x - this.panX) / this.zoom;
        };
        PanZoom.prototype.toY = function (y) {
            return (y - this.panY) / this.zoom;
        };
        PanZoom.prototype.toH = function (h) {
            return h / this.zoom;
        };
        PanZoom.prototype.toW = function (w) {
            return w / this.zoom;
        };

        PanZoom.prototype.calcXY = function (x, y) {
            return {
                x: x * this.zoom + this.panX,
                y: y * this.zoom + this.panY
            };
        };

        PanZoom.prototype.invXY = function (x, y) {
            return {
                x: (x - this.panX) / this.zoom,
                y: (y - this.panY) / this.zoom
            };
        };

        PanZoom.prototype.transform = function (ctx, tx, ty, rotate, sx, sy) {
            if (typeof tx === "undefined") { tx = 0; }
            if (typeof ty === "undefined") { ty = 0; }
            if (typeof rotate === "undefined") { rotate = 0; }
            if (typeof sx === "undefined") { sx = 1; }
            if (typeof sy === "undefined") { sy = 1; }
            ctx.translate(tx * this.zoom + this.panX, ty * this.zoom + this.panY);
            ctx.rotate(rotate);
            ctx.scale(sx * this.zoom, sy * this.zoom);
        };

        PanZoom.prototype.transformComplete = function (ctx, t) {
            var zoom = this.zoom;
            ctx.transform(zoom * t.a, zoom * t.b, zoom * t.c, zoom * t.d, t.tx * zoom + this.panX, t.ty * zoom + this.panY);
        };

        PanZoom.prototype.saveData = function () {
            return {
                type: "PanZoom",
                panX: this.panX,
                panY: this.panY,
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
    LayoutEditor.g_noPanZoom = new PanZoom();
})(LayoutEditor || (LayoutEditor = {}));
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    var Screen = (function () {
        function Screen() {
            this.types = [
                {
                    platform: 6 /* iPad_Landscape */,
                    width: 1024,
                    height: 672
                }, {
                    platform: 7 /* iPad_Portrait */,
                    width: 768,
                    height: 928
                }, {
                    platform: 8 /* iPad3_Landscape */,
                    width: 1024,
                    height: 692
                }, {
                    platform: 9 /* iPad3_Portrait */,
                    width: 768,
                    height: 928
                }, {
                    platform: 4 /* iPhone5_Landscape */,
                    width: 1136,
                    height: 424
                }, {
                    platform: 5 /* iPhone5_Portrait */,
                    width: 640,
                    height: 920
                }, {
                    platform: 2 /* iPhone4_Landscape */,
                    width: 960,
                    height: 424
                }, {
                    platform: 3 /* iPhone4_Portrait */,
                    width: 640,
                    height: 770
                }, {
                    platform: 0 /* iPhone_Landscape */,
                    width: 480,
                    height: 255
                }, {
                    platform: 1 /* iPhone_Portrait */,
                    width: 320,
                    height: 385
                }];
            this.screenType = null;
            this.screenType = this.getScreenType(1 /* iPhone_Portrait */);
        }
        Screen.prototype.getScreenType = function (platform) {
            for (var i = 0; i < this.types.length; ++i) {
                var type = this.types[i];
                if (type.platform === platform)
                    return type;
            }

            return null;
        };

        Screen.prototype.setPlatform = function (platform) {
            var screenType = this.getScreenType(platform);
            if (screenType !== null) {
                this.screenType = screenType;
                LayoutEditor.g_draw(this);
            }
        };

        Screen.prototype.getPlatform = function () {
            return this.screenType.platform;
        };

        Screen.prototype.draw = function (ctx) {
            if (!this.screenType)
                return;

            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;

            ctx.save();
            LayoutEditor.g_panZoom.transform(ctx);

            ctx.beginPath();
            ctx.rect(0, 0, this.screenType.width, this.screenType.height);

            ctx.restore();
            ctx.stroke(); // stroke after restore so stroke is not scaled
        };
        return Screen;
    })();
    LayoutEditor.Screen = Screen;

    (function (Screen) {
        (function (Platform) {
            Platform[Platform["iPhone_Landscape"] = 0] = "iPhone_Landscape";
            Platform[Platform["iPhone_Portrait"] = 1] = "iPhone_Portrait";
            Platform[Platform["iPhone4_Landscape"] = 2] = "iPhone4_Landscape";
            Platform[Platform["iPhone4_Portrait"] = 3] = "iPhone4_Portrait";
            Platform[Platform["iPhone5_Landscape"] = 4] = "iPhone5_Landscape";
            Platform[Platform["iPhone5_Portrait"] = 5] = "iPhone5_Portrait";
            Platform[Platform["iPad_Landscape"] = 6] = "iPad_Landscape";
            Platform[Platform["iPad_Portrait"] = 7] = "iPad_Portrait";
            Platform[Platform["iPad3_Landscape"] = 8] = "iPad3_Landscape";
            Platform[Platform["iPad3_Portrait"] = 9] = "iPad3_Portrait";
        })(Screen.Platform || (Screen.Platform = {}));
        var Platform = Screen.Platform;
    })(LayoutEditor.Screen || (LayoutEditor.Screen = {}));
    var Screen = LayoutEditor.Screen;

    LayoutEditor.g_screen = new Screen();
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
        Bounds.prototype.reset = function () {
            this.rotate = 0;
            this.cx = undefined;
            this.cy = undefined;
            this.hw = undefined;
            this.hh = undefined;
        };

        Bounds.prototype.getArea = function () {
            return this.hw * this.hh * 4;
        };

        Bounds.prototype.copy = function (other) {
            this.rotate = other.rotate;
            this.cx = other.cx;
            this.cy = other.cy;
            this.hw = other.hw;
            this.hh = other.hh;
        };

        Bounds.prototype.clone = function () {
            var newBounds = new Bounds();
            newBounds.copy(this);
            return newBounds;
        };

        Bounds.prototype.enclose = function (aabb) {
            Helper.assert(aabb.rotate === 0); // only works with unrotated bounds 0
            Helper.assert(this.rotate === 0);

            if (this.cx === undefined) {
                this.cx = aabb.cx;
                this.cy = aabb.cy;
                this.hw = aabb.hw;
                this.hh = aabb.hh;
            } else {
                var x1 = Math.min(this.cx - this.hw, aabb.cx - aabb.hw);
                var y1 = Math.min(this.cy - this.hh, aabb.cy - aabb.hh);
                var x2 = Math.max(this.cx + this.hw, aabb.cx + aabb.hw);
                var y2 = Math.max(this.cy + this.hh, aabb.cy + aabb.hh);
                this.cx = (x1 + x2) * 0.5;
                this.cy = (y1 + y2) * 0.5;
                this.hw = (x2 - x1) * 0.5;
                this.hh = (y2 - y1) * 0.5;
            }
        };

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
    var SimpleTransform = (function () {
        function SimpleTransform(scaleX, scaleY, shear, rotate, tx, ty) {
            this.scaleX = scaleX;
            this.scaleY = scaleY;
            this.shear = shear;
            this.rotate = rotate;
            this.tx = tx;
            this.ty = ty;
        }
        return SimpleTransform;
    })();
    LayoutEditor.SimpleTransform = SimpleTransform;

    var Transform = (function () {
        function Transform() {
            // | a| b|
            // | c| d|
            // |tx|ty|
            this.a = 1;
            this.b = 0;
            this.c = 0;
            this.d = 1;
            this.tx = 0;
            this.ty = 0;
        }
        Transform.prototype.setIdentity = function () {
            this.constructor();
        };

        Transform.prototype.setRotate = function (rad) {
            var sr = Math.sin(rad);
            var cr = Math.cos(rad);
            this.a = cr;
            this.b = -sr;
            this.c = sr;
            this.d = cr;
            // this.tx = 0;
            // this.ty = 0;
        };

        Transform.prototype.rotate = function (rad) {
            var sr = Math.sin(rad);
            var cr = Math.cos(rad);
            var a = this.a;
            var b = this.b;
            var c = this.c;
            var d = this.d;
            this.a = a * cr - b * sr;
            this.b = a * sr + b * cr;
            this.c = c * cr - d * sr;
            this.d = c * sr + d * cr;
        };

        Transform.prototype.scale = function (sx, sy) {
            this.a *= sx;
            this.b *= sy;
            this.c *= sx;
            this.d *= sy;
        };

        Transform.prototype.translate = function (tx, ty) {
            this.tx += tx;
            this.ty += ty;
        };

        Transform.prototype.decompose = function () {
            var a = this.a;
            var b = this.b;
            var c = this.c;
            var d = this.d;

            var scaleX = Math.sqrt(a * a + b * b);
            a /= scaleX;
            b /= scaleX;

            var shear = a * c + b * d;
            c -= a * shear;
            d -= b * shear;

            var scaleY = Math.sqrt(c * c + d * d);
            c /= scaleY;
            d /= scaleY;
            shear /= scaleY;

            if (a * d < b * c) {
                a = -a;
                b = -b;
                shear = -shear;
                scaleX = -scaleX;
            }

            return new SimpleTransform(scaleX, scaleY, shear, Math.atan2(b, a), this.tx, this.ty);
        };

        Transform.prototype.calcXY = function (lx, ly) {
            return {
                x: lx * this.a + ly * this.c + this.tx,
                y: lx * this.b + ly * this.d + this.ty
            };
        };

        Transform.prototype.copy = function (other) {
            this.a = other.a;
            this.b = other.b;
            this.c = other.c;
            this.d = other.d;
            this.tx = other.tx;
            this.ty = other.ty;
        };

        Transform.prototype.clone = function () {
            var t = new Transform();
            t.copy(this);
            return t;
        };

        Transform.prototype.invXY = function (x, y) {
            var det = this.a * this.d - this.b * this.c;
            Helper.assert(Math.abs(det) > LayoutEditor.EPSILON);

            var a = this.d;
            var b = -this.c;
            var c = -this.b;
            var d = this.a;
            var tx = (this.b * this.ty - this.d * this.tx);
            var ty = (this.c * this.tx - this.a * this.ty);

            return {
                x: (x * a + y * c + tx) / det,
                y: (x * b + y * d + ty) / det
            };
        };

        Transform.prototype.isEqual = function (other) {
            return this.tx === other.tx && this.ty === other.ty && this.a === other.a && this.b === other.b && this.c === other.c && this.d === other.d;
        };
        return Transform;
    })();
    LayoutEditor.Transform = Transform;

    //------------------------------
    var Shape = (function () {
        function Shape(name) {
            this.style = LayoutEditor.g_style;
            this.isDeleted = false;
            this.isHidden = false;
            this.oabb = new Bounds();
            this.aabb = new Bounds();
            this.transform = new Transform();
            this.name = "";
            this.text = "";
            if (typeof name === "undefined")
                this.makeUnique();
            else
                this.name = name;
        }
        Shape.prototype.makeUnique = function () {
            this.name = "Shape" + Shape.uniqueID++;
        };

        Shape.prototype.setStyle = function (style) {
            this.style = style;
        };

        Shape.prototype.getStyle = function () {
            return this.style;
        };

        Shape.prototype.draw = function (ctx, panZoom) {
            this.style.drawShape(ctx);

            this.buildPath(ctx, panZoom);

            if (this.style.fillStyle !== "none")
                ctx.fill();
            if (this.style.strokeStyle !== "none")
                ctx.stroke();

            this.drawText(ctx, panZoom);
        };

        // implemented in the derived class
        Shape.prototype.buildPath = function (ctx, panZoom) {
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

        Shape.prototype.drawText = function (ctx, panZoom) {
            if (this.text.length === 0)
                return;

            var oabb = this.oabb;

            ctx.save();
            panZoom.transform(ctx, oabb.cx, oabb.cy, oabb.rotate);

            this.style.drawFont(ctx);

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
            this.buildPath(ctx, LayoutEditor.g_noPanZoom);
            return ctx.isPointInPath(x, y);
        };

        Shape.prototype.isInsideOABBXY = function (x, y) {
            var oabb = this.oabb;
            var localPos = oabb.invXY(x, y);
            return localPos.x >= -oabb.hw && localPos.x < oabb.hw && localPos.y >= -oabb.hh && localPos.y < oabb.hh;
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
        RectShape.prototype.buildPath = function (ctx, panZoom) {
            var transform = this.transform;

            ctx.save();
            panZoom.transformComplete(ctx, transform);

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
            this.transform.tx = x + w * 0.5;
            this.transform.ty = y + h * 0.5;
            this.w = w;
            this.h = h;
            this.calculateBounds();
        };

        RectShape.prototype.calculateBounds = function () {
            var transform = this.transform;
            var dx = this.w * 0.5;
            var dy = this.h * 0.5;

            var info = transform.decompose();
            this.oabb.rotate = info.rotate;
            this.oabb.hw = Math.abs(dx * info.scaleX);
            this.oabb.hh = Math.abs(dy * info.scaleY);
            this.oabb.cx = transform.tx;
            this.oabb.cy = transform.ty;

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
        EllipseShape.prototype.buildPath = function (ctx, panZoom) {
            var transform = this.transform;
            var rx = Math.abs(this.rx);
            var ry = Math.abs(this.ry);

            ctx.save();
            panZoom.transformComplete(ctx, transform);

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
            this.transform.tx = x + w * 0.5;
            this.transform.ty = y + h * 0.5;
            this.rx = w * 0.5;
            this.ry = h * 0.5;
            this.calculateBounds();
        };

        EllipseShape.prototype.calculateBounds = function () {
            var transform = this.transform;

            var info = transform.decompose();
            var hw = Math.abs(this.rx * info.scaleX);
            var hh = Math.abs(this.ry * info.scaleY);

            this.oabb.rotate = info.rotate;
            this.oabb.hw = hw;
            this.oabb.hh = hh;
            this.oabb.cx = transform.tx;
            this.oabb.cy = transform.ty;

            this.aabb.rotate = 0;

            var rot = info.rotate;
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

        AABBShape.prototype.reset = function () {
            this.x1 = undefined;
            this.y1 = undefined;
            this.x2 = undefined;
            this.y2 = undefined;
        };

        AABBShape.prototype.buildPath = function (ctx, panZoom) {
            // don't apply transform!
            var x1 = this.oabb.cx - this.oabb.hw;
            var y1 = this.oabb.cy - this.oabb.hh;
            ctx.save();
            panZoom.transform(ctx);
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

    var GroupShape = (function (_super) {
        __extends(GroupShape, _super);
        function GroupShape(name) {
            _super.call(this, name);
            this.shapes = [];
            this.oldTransforms = [];
            this.lastTransform = new Transform();
            this.encloseHH = 0;
            this.encloseHW = 0;
            this.encloseCX = 0;
            this.encloseCY = 0;
        }
        GroupShape.prototype.reset = function () {
            this.shapes.length = 0;
            this.encloseHW = 0;
            this.encloseHH = 0;
            this.encloseCX = 0;
            this.encloseCY = 0;
        };

        GroupShape.prototype.setShapes = function (shapes) {
            this.shapes = shapes.slice(); // copy

            this.encloseShapes();
        };

        GroupShape.prototype.setStyle = function (style) {
            _super.prototype.setStyle.call(this, style);

            for (var i = 0; i < this.shapes.length; ++i) {
                this.shapes[i].setStyle(style);
            }
        };

        GroupShape.prototype.copy = function (base) {
            if (!base)
                base = new GroupShape();
            _super.prototype.copy.call(this, base);
            Helper.extend(base.lastTransform, this.lastTransform);

            for (var i = 0; i < this.shapes.length; ++i) {
                base.oldTransforms[i] = new Transform();
                Helper.extend(base.oldTransforms[i], this.oldTransforms[i]);
                base.shapes[i] = this.shapes[i].copy();
            }
            return base;
        };

        // shapes in this group will be drawn independently
        GroupShape.prototype.draw = function (ctx) {
        };

        // use a standard draw for the subelements, when selected
        GroupShape.prototype.drawSelect = function (ctx) {
            if (this.shapes.length === 0)
                return;

            // draw the bounds
            LayoutEditor.g_selectStyle.drawShape(ctx);
            _super.prototype.drawSelect.call(this, ctx);
        };

        // check each sub-shape individually
        GroupShape.prototype.isInsideXY = function (ctx, x, y) {
            for (var i = 0; i < this.shapes.length; ++i) {
                if (this.shapes[i].isInsideXY(ctx, x, y))
                    return true;
            }

            return false;
        };

        GroupShape.prototype.applyTransform = function () {
            if (this.transform.isEqual(this.lastTransform))
                return;

            var transform = this.transform;
            var info = transform.decompose();

            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                var oldTransform = this.oldTransforms[i];

                var newPos = transform.calcXY(oldTransform.tx - this.encloseCX, oldTransform.ty - this.encloseCY);

                Helper.extend(shape.transform, oldTransform);
                shape.transform.tx = newPos.x;
                shape.transform.ty = newPos.y;

                // TODO - this is wrong
                shape.transform.scale(info.scaleX, info.scaleY);
                shape.transform.rotate(info.rotate);

                shape.calculateBounds();
            }

            Helper.extend(this.lastTransform, this.transform);
        };

        GroupShape.prototype.encloseShapes = function () {
            var aabb = this.aabb;
            var oabb = this.oabb;

            var numShapes = this.shapes.length;
            aabb.reset();

            this.oldTransforms.length = 0;
            for (var i = 0; i < numShapes; ++i) {
                var shape = this.shapes[i];

                this.oldTransforms[i] = new Transform();
                Helper.extend(this.oldTransforms[i], this.shapes[i].transform);

                aabb.enclose(shape.aabb);
            }

            if (numShapes === 1) {
                Helper.extend(oabb, this.shapes[0].oabb); // if only one shape then mimic it
            } else {
                Helper.extend(oabb, aabb); // initial oabb matches aabb
            }

            var transform = this.transform;
            transform.setIdentity();
            transform.tx = aabb.cx;
            transform.ty = aabb.cy;

            Helper.extend(this.lastTransform, transform);

            this.encloseHW = aabb.hw;
            this.encloseHH = aabb.hh;
            this.encloseCX = aabb.cx;
            this.encloseCY = aabb.cy;
        };

        GroupShape.prototype.calculateBounds = function () {
            // move all the sub-objects
            this.applyTransform();

            var transform = this.transform;
            var oabb = this.oabb;
            var aabb = this.aabb;
            var info = transform.decompose();

            oabb.rotate = info.rotate;
            oabb.hw = Math.abs(this.encloseHW * info.scaleX);
            oabb.hh = Math.abs(this.encloseHH * info.scaleY);
            oabb.cx = transform.tx;
            oabb.cy = transform.ty;

            var polygon = oabb.toPolygon();
            var x1 = Helper.arrayMin(polygon, 0, 2);
            var x2 = Helper.arrayMax(polygon, 0, 2);
            var y1 = Helper.arrayMin(polygon, 1, 2);
            var y2 = Helper.arrayMax(polygon, 1, 2);

            aabb.rotate = 0;
            aabb.hw = (x2 - x1) * 0.5;
            aabb.hh = (y2 - y1) * 0.5;
            aabb.cx = (x1 + x2) * 0.5;
            aabb.cy = (y1 + y2) * 0.5;
        };

        GroupShape.prototype.saveData = function () {
            var obj = _super.prototype.saveData.call(this);
            obj.type = "GroupShape";
            return obj;
        };

        GroupShape.prototype.loadData = function (obj) {
            Helper.assert(obj.type === "GroupShape");
            _super.prototype.loadData.call(this, obj);
        };
        return GroupShape;
    })(Shape);
    LayoutEditor.GroupShape = GroupShape;

    //------------------------------
    var ShapeList = (function () {
        function ShapeList() {
            this.shapes = [];
            this.deletedShapes = [];
            this.hitCtx = document.createElement("canvas").getContext("2d");
        }
        ShapeList.prototype.reset = function () {
            this.shapes.length = 0;
            this.deletedShapes.length = 0;
        };

        ShapeList.prototype.addShapes = function (shapes) {
            for (var i = 0; i < shapes.length; ++i)
                this.addShape(shapes[i]);
        };

        ShapeList.prototype.removeShapes = function (shapes) {
            for (var i = 0; i < shapes.length; ++i)
                this.removeShape(shapes[i]);
        };

        ShapeList.prototype.addShape = function (shape) {
            shape.isDeleted = false;

            // add the shape if not already present
            var shapeIndex = this.shapes.indexOf(shape);
            if (shapeIndex === -1)
                this.shapes.push(shape);

            // undelete the shape if necessary
            var deletedIndex = this.deletedShapes.indexOf(shape);
            if (deletedIndex !== -1)
                this.deletedShapes.splice(deletedIndex, 1);

            LayoutEditor.g_draw(this);
        };

        ShapeList.prototype.removeShape = function (shape) {
            shape.isDeleted = true;

            var shapeIndex = this.shapes.indexOf(shape);
            if (shapeIndex !== -1)
                this.shapes.splice(shapeIndex, 1);

            var deletedIndex = this.deletedShapes.indexOf(shape);
            if (deletedIndex === -1)
                this.deletedShapes.push(shape);

            LayoutEditor.g_draw(this);
        };

        ShapeList.prototype.hideShapes = function (shapes) {
            for (var i = 0; i < shapes.length; ++i) {
                shapes[i].isHidden = true;
            }
            LayoutEditor.g_draw(this);
        };

        ShapeList.prototype.showShapes = function (shapes) {
            for (var i = 0; i < shapes.length; ++i) {
                shapes[i].isHidden = false;
            }
            LayoutEditor.g_draw(this);
        };

        ShapeList.prototype.duplicateShape = function (shape) {
            var newShape = shape.copy();
            newShape.makeUnique();

            this.addShape(newShape);
            return newShape;
        };

        ShapeList.prototype.draw = function (ctx) {
            // normal shapes
            var numShapes = this.shapes.length;
            for (var i = 0; i < numShapes; ++i) {
                var shape = this.shapes[i];
                if (!shape.isHidden)
                    shape.draw(ctx, LayoutEditor.g_panZoom);
            }
        };

        ShapeList.prototype.getShapeInXY = function (x, y) {
            for (var i = this.shapes.length - 1; i >= 0; --i) {
                var shape = this.shapes[i];
                if (!shape.isHidden && shape.isInsideXY(this.hitCtx, x, y))
                    return shape;
            }

            return null;
        };

        ShapeList.prototype.getShapesInBounds = function (bounds) {
            var shapes = [];

            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                if (!shape.isHidden && shape.isOverlapBounds(bounds)) {
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
                obj.shapes.push(shape.saveData());
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
        canHandle: function (obj) {
            return obj instanceof Shape;
        },
        items: [
            {
                prop: "name"
            }, {
                prop: "style",
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
    //------------------------------
    var SelectList = (function () {
        function SelectList() {
            this.selectedShapes = [];
            this.selectGroup = new LayoutEditor.GroupShape("Select");
        }
        SelectList.prototype.reset = function () {
            this.selectedShapes.length = 0;
        };

        // removes the shape from the selected list
        SelectList.prototype.removeSelected = function (shape) {
            var index = this.selectedShapes.indexOf(shape);
            if (index !== -1) {
                this.selectedShapes.splice(index, 1);
                this.rebuildSelectGroup();
            }
        };

        SelectList.prototype.toggleSelected = function (shapes) {
            for (var i = 0; i < shapes.length; ++i) {
                var shape = shapes[i];
                var index = this.selectedShapes.indexOf(shape);
                if (index === -1)
                    this.selectedShapes.push(shape);
                else
                    this.selectedShapes.splice(index, 1);
            }
            this.rebuildSelectGroup();
        };

        SelectList.prototype.isSelected = function (shape) {
            return this.selectedShapes.indexOf(shape) !== -1;
        };

        SelectList.prototype.setSelectedShapes = function (shapes) {
            this.selectedShapes = shapes.slice(); // copy
            this.rebuildSelectGroup();
        };

        // returns the instance
        SelectList.prototype.getSelectedShapes = function () {
            return this.selectedShapes;
        };

        SelectList.prototype.clearSelectedShapes = function () {
            this.selectedShapes.length = 0;
            this.rebuildSelectGroup();
        };

        // deletes all of the selected shapes
        SelectList.prototype.deleteSelected = function () {
            for (var i = this.selectedShapes.length - 1; i >= 0; --i) {
                LayoutEditor.g_shapeList.removeShape(this.selectedShapes[i]);
            }
            this.selectedShapes.length = 0;

            this.rebuildSelectGroup();
        };

        SelectList.prototype.showSelected = function () {
            LayoutEditor.g_shapeList.showShapes(this.selectedShapes);
        };

        SelectList.prototype.hideSelected = function () {
            LayoutEditor.g_shapeList.hideShapes(this.selectedShapes);
        };

        // duplicates all of the selected shapes
        SelectList.prototype.duplicateSelected = function () {
            var copyShapes = [];
            for (var i = 0; i < this.selectedShapes.length; ++i) {
                var copyShape = LayoutEditor.g_shapeList.duplicateShape(this.selectedShapes[i]);
                copyShape.transform.tx += 20;
                copyShape.calculateBounds();
                copyShapes.push(copyShape);
            }

            this.rebuildSelectGroup();
            return copyShapes;
        };

        SelectList.prototype.draw = function (ctx) {
            this.selectGroup.drawSelect(ctx);
        };

        SelectList.prototype.rebuildSelectGroup = function () {
            this.selectGroup.reset();
            this.selectGroup.setShapes(this.selectedShapes);

            LayoutEditor.g_draw(this);

            if (this.selectedShapes.length > 0)
                LayoutEditor.g_propertyPanel.setObject(this.selectedShapes[0]);
            else
                LayoutEditor.g_propertyPanel.setObject(null);
        };
        return SelectList;
    })();
    LayoutEditor.SelectList = SelectList;

    LayoutEditor.g_selectList = new SelectList();
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

        Grid.prototype.clearSnap = function () {
            this.snappedX = undefined;
            this.snappedY = undefined;
        };

        Grid.prototype.snapX = function (x) {
            this.snappedX = undefined;
            if (this.snapToGrid) {
                x = x % this.gridSize;
            } else if (this.snapToShape) {
                var i = Helper.getIndexOfSorted(this.xTabs, x);
                i = this.getClosestIndex(this.xTabs, x, i);
                if (Math.abs(this.xTabs[i] - x) < this.shapeGravity) {
                    x = this.xTabs[i];
                    this.snappedX = x;
                }
            }

            return x;
        };

        Grid.prototype.snapY = function (y) {
            this.snappedY = undefined;
            if (this.snapToGrid) {
                y = y % this.gridSize;
            } else if (this.snapToShape) {
                var j = Helper.getIndexOfSorted(this.yTabs, y);
                j = this.getClosestIndex(this.yTabs, y, j);
                if (Math.abs(this.yTabs[j] - y) < this.shapeGravity) {
                    y = this.yTabs[j];
                    this.snappedY = y;
                }
            }

            return y;
        };

        Grid.prototype.snapXY = function (x, y) {
            return {
                x: this.snapX(x),
                y: this.snapY(y)
            };
        };

        Grid.prototype.rebuildTabs = function (excludeShapes) {
            if (typeof excludeShapes === "undefined") { excludeShapes = []; }
            if (!this.snapToShape)
                return;

            this.xTabs.length = 0;
            this.yTabs.length = 0;

            for (var i = 0; i < LayoutEditor.g_shapeList.shapes.length; ++i) {
                var shape = LayoutEditor.g_shapeList.shapes[i];
                if (shape.isHidden || excludeShapes.indexOf(shape) !== -1)
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
        };

        Grid.prototype.draw = function (ctx) {
            if (this.snappedX !== undefined || this.snappedY !== undefined) {
                LayoutEditor.g_snapStyle.drawShape(ctx);

                ctx.save();
                LayoutEditor.g_panZoom.transform(ctx);

                ctx.beginPath();

                if (this.snappedX !== undefined) {
                    ctx.moveTo(this.snappedX, 0);
                    ctx.lineTo(this.snappedX, 1000);
                }
                if (this.snappedY !== undefined) {
                    ctx.moveTo(0, this.snappedY);
                    ctx.lineTo(1000, this.snappedY);
                }

                ctx.restore();
                ctx.stroke();
            }
            // ctx.save();
            // g_panZoom.transform(ctx);
            // ctx.beginPath();
            // for (var i = 0; i < this.xTabs.length; ++i) {
            //     ctx.moveTo(this.xTabs[i], 0);
            //     ctx.lineTo(this.xTabs[i], 1000);
            // }
            // for (var i = 0; i < this.yTabs.length; ++i) {
            //     ctx.moveTo(0, this.yTabs[i]);
            //     ctx.lineTo(1000, this.yTabs[i]);
            // }
            // ctx.stroke();
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
            LayoutEditor.g_selectList.setSelectedShapes([this.shape]);
            LayoutEditor.g_propertyPanel.setObject(this.shape);
        };

        ShapeCommand.prototype.undo = function () {
            LayoutEditor.g_shapeList.removeShape(this.shape);
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
            this.shape.transform.tx = cx;
            this.shape.transform.ty = cy;
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
            this.shape.transform.tx = cx;
            this.shape.transform.ty = cy;
            this.shape.setStyle(LayoutEditor.g_style);
            this.shape.calculateBounds();
        }
        return EllipseCommand;
    })(ShapeCommand);
    LayoutEditor.EllipseCommand = EllipseCommand;

    // handles MoveCommand, RotateCommand, ResizeCommand
    var TransformCommand = (function () {
        function TransformCommand(shapes, oldTransforms) {
            this.shapes = [];
            this.oldTransforms = [];
            this.transforms = [];
            for (var i = 0; i < shapes.length; ++i) {
                this.shapes[i] = shapes[i];
                this.transforms[i] = shapes[i].transform.clone();
                this.oldTransforms[i] = oldTransforms[i].clone();
            }
        }
        TransformCommand.prototype.redo = function () {
            for (var i = 0; i < this.shapes.length; ++i) {
                this.shapes[i].transform.copy(this.transforms[i]);
            }

            LayoutEditor.g_draw(LayoutEditor.g_shapeList);
        };

        TransformCommand.prototype.undo = function () {
            for (var i = 0; i < this.shapes.length; ++i) {
                this.shapes[i].transform.copy(this.oldTransforms[i]);
            }

            LayoutEditor.g_draw(LayoutEditor.g_shapeList);
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
            LayoutEditor.g_draw(LayoutEditor.g_shapeList);
        };

        TextCommand.prototype.undo = function () {
            this.shape.text = this.oldText;
            LayoutEditor.g_draw(LayoutEditor.g_shapeList);
        };
        return TextCommand;
    })();
    LayoutEditor.TextCommand = TextCommand;

    // export class PropertyCommand implements Command {
    //     oldValue: string;
    //     constructor(public propertyInfo: PropertyInfo, public value: string) {
    //         this.oldValue = propertyInfo.object[propertyInfo.name].toString();
    //     }
    //     redo() {
    //         this.setValue(this.value);
    //     }
    //     undo() {
    //         this.setValue(this.oldValue);
    //     }
    //     setValue(value: string) {
    //         var propertyInfo: PropertyInfo = this.propertyInfo;
    //         var type: string = typeof propertyInfo.object[propertyInfo.name];
    //         if (type === "number")
    //             propertyInfo.object[propertyInfo.name] = parseInt(value);
    //         else if (type === "string")
    //             propertyInfo.object[propertyInfo.name] = value;
    //         else
    //             Helper.assert(false); // can't handle this type
    //         g_draw(g_shapeList);
    //         g_draw(g_propertyPanel);
    //     }
    // }
    var DuplicateSelectedCommand = (function () {
        function DuplicateSelectedCommand() {
            this.oldSelected = LayoutEditor.g_selectList.getSelectedShapes().slice();
        }
        DuplicateSelectedCommand.prototype.redo = function () {
            if (!this.duplicatedShapes) {
                this.duplicatedShapes = LayoutEditor.g_selectList.duplicateSelected();
            } else {
                // re-add the shapes from the previous undo - don't re-duplicate them
                LayoutEditor.g_shapeList.addShapes(this.duplicatedShapes);
            }
            LayoutEditor.g_selectList.setSelectedShapes(this.duplicatedShapes);
        };

        DuplicateSelectedCommand.prototype.undo = function () {
            LayoutEditor.g_selectList.deleteSelected();
            LayoutEditor.g_selectList.setSelectedShapes(this.oldSelected);
        };
        return DuplicateSelectedCommand;
    })();
    LayoutEditor.DuplicateSelectedCommand = DuplicateSelectedCommand;

    var DeleteSelectedCommand = (function () {
        function DeleteSelectedCommand() {
            this.oldSelected = LayoutEditor.g_selectList.getSelectedShapes().slice();
        }
        DeleteSelectedCommand.prototype.redo = function () {
            LayoutEditor.g_selectList.deleteSelected();
        };

        DeleteSelectedCommand.prototype.undo = function () {
            LayoutEditor.g_shapeList.addShapes(this.oldSelected);
            LayoutEditor.g_selectList.setSelectedShapes(this.oldSelected);
        };
        return DeleteSelectedCommand;
    })();
    LayoutEditor.DeleteSelectedCommand = DeleteSelectedCommand;

    LayoutEditor.g_drawCtx = null;
})(LayoutEditor || (LayoutEditor = {}));
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    

    var DrawTool = (function () {
        function DrawTool() {
            this.shape = null;
            this.canUse = false;
            this.isDrawing = false;
        }
        DrawTool.prototype.draw = function (ctx) {
            if (this.shape && this.isDrawing) {
                this.shape.calculateBounds();
                this.shape.draw(ctx, LayoutEditor.g_panZoom);
            }
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
            this.rectShape.setStyle(LayoutEditor.g_drawStyle);
        }
        RectTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 1 /* Start */:
                    LayoutEditor.g_grid.rebuildTabs();
                    var pos = LayoutEditor.g_grid.snapXY(e.x, e.y);
                    this.x1 = pos.x;
                    this.y1 = pos.y;
                    this.isDrawing = true;
                    break;

                case 2 /* Move */:
                    var pos = LayoutEditor.g_grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
                    this.canUse = true;
                    LayoutEditor.g_draw(this);
                    break;

                case 3 /* End */:
                    if (this.canUse) {
                        var newCommand = new LayoutEditor.RectCommand(this.rectShape.transform.tx, this.rectShape.transform.ty, this.rectShape.w, this.rectShape.h);
                        LayoutEditor.g_commandList.addCommand(newCommand);
                        this.canUse = false;
                        LayoutEditor.g_draw(this);
                    }

                    this.isDrawing = false;
                    isHandled = true;
                    break;
            }
            return isHandled || this.isDrawing;
        };

        RectTool.prototype.draw = function (ctx) {
            if (!this.isDrawing)
                return;

            this.rectShape.fromRect(Math.min(this.x1, this.x2), Math.min(this.y1, this.y2), Math.abs(this.x2 - this.x1), Math.abs(this.y2 - this.y1));

            _super.prototype.draw.call(this, ctx);

            if (LayoutEditor.g_grid.snappedX > -1 || LayoutEditor.g_grid.snappedY > -1) {
                ctx.save();
                LayoutEditor.g_panZoom.transform(ctx);
                ctx.beginPath();
                LayoutEditor.g_snapStyle.drawShape(ctx);
                ctx.moveTo(LayoutEditor.g_grid.snappedX, 0);
                ctx.lineTo(LayoutEditor.g_grid.snappedX, 1000);
                ctx.moveTo(0, LayoutEditor.g_grid.snappedY);
                ctx.lineTo(1000, LayoutEditor.g_grid.snappedY);
                ctx.stroke();
                ctx.restore();
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
            this.ellipseShape.setStyle(LayoutEditor.g_drawStyle);
        }
        EllipseTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 1 /* Start */:
                    LayoutEditor.g_grid.rebuildTabs();
                    var pos = LayoutEditor.g_grid.snapXY(e.x, e.y);
                    this.x1 = pos.x;
                    this.y1 = pos.y;
                    this.isDrawing = true;
                    break;
                case 2 /* Move */:
                    var pos = LayoutEditor.g_grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
                    this.canUse = true;
                    LayoutEditor.g_draw(this);
                    break;
                case 3 /* End */:
                    if (this.canUse) {
                        var newCommand = new LayoutEditor.EllipseCommand(this.ellipseShape.transform.tx, this.ellipseShape.transform.ty, this.ellipseShape.rx, this.ellipseShape.ry);
                        LayoutEditor.g_commandList.addCommand(newCommand);
                        this.canUse = false;
                        LayoutEditor.g_draw(this);
                    }
                    this.isDrawing = false;
                    isHandled = true;
                    break;
            }

            return isHandled || this.isDrawing;
        };

        EllipseTool.prototype.draw = function (ctx) {
            if (!this.isDrawing)
                return;

            this.ellipseShape.fromRect(Math.min(this.x1, this.x2), Math.min(this.y1, this.y2), Math.abs(this.x2 - this.x1), Math.abs(this.y2 - this.y1));
            _super.prototype.draw.call(this, ctx);

            if (LayoutEditor.g_grid.snappedX > -1 || LayoutEditor.g_grid.snappedY > -1) {
                ctx.save();
                LayoutEditor.g_panZoom.transform(ctx);
                ctx.beginPath();
                LayoutEditor.g_snapStyle.drawShape(ctx);
                ctx.moveTo(LayoutEditor.g_grid.snappedX, 0);
                ctx.lineTo(LayoutEditor.g_grid.snappedX, 1000);
                ctx.moveTo(0, LayoutEditor.g_grid.snappedY);
                ctx.lineTo(1000, LayoutEditor.g_grid.snappedY);
                ctx.stroke();
                ctx.restore();
            }
        };
        return EllipseTool;
    })(DrawTool);
    LayoutEditor.EllipseTool = EllipseTool;

    var SelectTool = (function () {
        function SelectTool() {
            this.aabbShape = new LayoutEditor.AABBShape();
            this.isDrawing = false;
            this.aabbShape.setStyle(LayoutEditor.g_selectStyle);
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
                    this.isDrawing = true;
                    break;
                case 2 /* Move */:
                    this.aabbShape.x2 = e.x;
                    this.aabbShape.y2 = e.y;
                    this.aabbShape.calculateBounds();
                    LayoutEditor.g_draw(this);
                    break;
                case 3 /* End */:
                    var shapes = LayoutEditor.g_shapeList.getShapesInBounds(this.aabbShape.aabb);
                    LayoutEditor.g_selectList.setSelectedShapes(shapes);
                    this.isDrawing = false;
                    LayoutEditor.g_draw(this);
                    isHandled = true;
                    break;
            }

            return this.isDrawing || isHandled;
        };

        SelectTool.prototype.onChangeFocus = function (focus) {
        };

        SelectTool.prototype.draw = function (ctx) {
            if (!this.isDrawing)
                return;

            this.aabbShape.draw(ctx, LayoutEditor.g_panZoom);

            LayoutEditor.g_selectStyle.drawShape(ctx);
            var shapes = LayoutEditor.g_shapeList.getShapesInBounds(this.aabbShape.aabb);
            for (var i = 0; i < shapes.length; ++i) {
                shapes[i].drawSelect(ctx);
            }
        };
        return SelectTool;
    })();
    LayoutEditor.SelectTool = SelectTool;

    var ResizeTool = (function () {
        function ResizeTool() {
            this.isDrawing = false;
            this.handleSize = 20;
            this.handle = 0 /* None */;
            this.canUse = false;
            this.startLocalPos = null;
            this.oldInfo = null;
            this.oldTransform = new LayoutEditor.Transform();
            this.deltaX = 0;
            this.deltaY = 0;
            this.oldOABB = new LayoutEditor.Bounds();
            this.oldShapeTransforms = [];
        }
        ResizeTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 1 /* Start */:
                    var shape = LayoutEditor.g_shapeList.getShapeInXY(e.x, e.y);
                    this.handle = 0 /* None */;

                    if (shape) {
                        if (!LayoutEditor.g_selectList.isSelected(shape)) {
                            LayoutEditor.g_selectList.setSelectedShapes([shape]);
                        }
                    }

                    var selectGroup = LayoutEditor.g_selectList.selectGroup;
                    if (selectGroup.isInsideOABBXY(e.x, e.y)) {
                        LayoutEditor.g_selectList.hideSelected(); // hide before rebuilding tabs, so we don't include them
                        LayoutEditor.g_grid.rebuildTabs();

                        this.oldOABB.copy(selectGroup.oabb);
                        this.oldTransform.copy(selectGroup.transform);

                        var shapes = LayoutEditor.g_selectList.selectGroup.shapes;
                        for (var i = 0; i < shapes.length; ++i) {
                            this.oldShapeTransforms[i] = shapes[i].transform.clone();
                        }

                        var oldOABB = this.oldOABB;
                        var localPos = oldOABB.invXY(e.x, e.y);
                        var handleX = this.handleSize;
                        var handleY = this.handleSize;
                        this.oldInfo = selectGroup.transform.decompose();

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
                        this.isDrawing = true;
                        this.deltaX = 0;
                        this.deltaY = 0;
                    }
                    break;

                case 2 /* Move */:
                    if (this.isDrawing) {
                        var transform = LayoutEditor.g_selectList.selectGroup.transform;
                        var oldOABB = this.oldOABB;
                        var oldInfo = this.oldInfo;

                        var localPos = oldOABB.invXY(e.x, e.y);
                        var dx = (localPos.x - this.startLocalPos.x);
                        var dy = (localPos.y - this.startLocalPos.y);
                        var sx = dx * oldInfo.scaleX / (oldOABB.hw * 2);
                        var sy = dy * oldInfo.scaleY / (oldOABB.hh * 2);
                        var cr = Math.cos(oldOABB.rotate);
                        var sr = Math.sin(oldOABB.rotate);

                        var newX = oldInfo.tx;
                        var newY = oldInfo.ty;
                        var newScaleX = oldInfo.scaleX;
                        var newScaleY = oldInfo.scaleY;

                        if (this.handle & 1 /* Left */) {
                            newX += dx * cr * 0.5;
                            newY += dx * sr * 0.5;
                            newScaleX -= sx;
                        } else if (this.handle & 2 /* Right */) {
                            newX += dx * cr * 0.5;
                            newY += dx * sr * 0.5;
                            newScaleX += sx;
                        }

                        if (this.handle & 4 /* Top */) {
                            newX -= dy * sr * 0.5;
                            newY += dy * cr * 0.5;
                            newScaleY -= sy;
                        } else if (this.handle & 8 /* Bottom */) {
                            newX -= dy * sr * 0.5;
                            newY += dy * cr * 0.5;
                            newScaleY += sy;
                        }

                        if (this.handle === 16 /* Middle */) {
                            this.deltaX += e.deltaX;
                            this.deltaY += e.deltaY;
                            newX += this.deltaX;
                            newY += this.deltaY;
                        }

                        transform.setIdentity();
                        transform.scale(newScaleX, newScaleY);
                        transform.rotate(this.oldInfo.rotate);
                        transform.translate(newX, newY);

                        LayoutEditor.g_selectList.selectGroup.calculateBounds();
                        this.canUse = this.handle !== 0 /* None */;
                        LayoutEditor.g_draw(this);
                        isHandled = true;
                    }
                    break;

                case 3 /* End */:
                    if (this.isDrawing && this.canUse) {
                        var newCommand = new LayoutEditor.TransformCommand(LayoutEditor.g_selectList.selectGroup.shapes, this.oldShapeTransforms);
                        LayoutEditor.g_commandList.addCommand(newCommand);
                        LayoutEditor.g_selectList.showSelected();
                        LayoutEditor.g_draw(this);
                        isHandled = true;
                    }
                    this.canUse = false;
                    this.isDrawing = false;
                    this.oldShapeTransforms.length = 0;
                    break;
            }

            return isHandled || this.isDrawing;
        };

        ResizeTool.prototype.onChangeFocus = function (focus) {
        };

        ResizeTool.prototype.draw = function (ctx) {
            if (!this.isDrawing)
                return;

            for (var i = 0; i < LayoutEditor.g_selectList.selectedShapes.length; ++i) {
                LayoutEditor.g_selectList.selectedShapes[i].draw(ctx, LayoutEditor.g_panZoom); // draw the shape in the tool context
            }
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
            this.lastAngle = 0;
            this.pivotX = 0;
            this.pivotY = 0;
            this.oldTransform = new LayoutEditor.Transform();
            this.oldShapeTransforms = [];
            this.isDrawing = false;
        }
        RotateTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 1 /* Start */:
                    var shape = LayoutEditor.g_shapeList.getShapeInXY(e.x, e.y);
                    if (shape) {
                        if (!LayoutEditor.g_selectList.isSelected(shape)) {
                            LayoutEditor.g_selectList.setSelectedShapes([shape]);
                        }
                    }

                    var selectGroup = LayoutEditor.g_selectList.selectGroup;
                    if (selectGroup.isInsideOABBXY(e.x, e.y)) {
                        LayoutEditor.g_selectList.hideSelected();

                        this.oldTransform.copy(selectGroup.transform);

                        var shapes = LayoutEditor.g_selectList.selectGroup.shapes;
                        for (var i = 0; i < shapes.length; ++i) {
                            this.oldShapeTransforms[i] = shapes[i].transform.clone();
                        }

                        this.pivotX = selectGroup.transform.tx;
                        this.pivotY = selectGroup.transform.tx;
                        this.lastAngle = this.getAngle(e.x, e.y, this.pivotX, this.pivotY);
                        this.isDrawing = true;
                        isHandled = true;
                    }
                    break;

                case 2 /* Move */:
                    if (this.isDrawing) {
                        var newAngle = this.getAngle(e.x, e.y, this.pivotX, this.pivotY);
                        LayoutEditor.g_selectList.selectGroup.transform.rotate(newAngle - this.lastAngle);
                        LayoutEditor.g_selectList.selectGroup.calculateBounds();
                        LayoutEditor.g_draw(this);

                        isHandled = true;
                        this.lastAngle = newAngle;
                    }
                    break;

                case 3 /* End */:
                    if (this.isDrawing) {
                        var newCommand = new LayoutEditor.TransformCommand(LayoutEditor.g_selectList.selectGroup.shapes, this.oldShapeTransforms);
                        LayoutEditor.g_commandList.addCommand(newCommand);
                        LayoutEditor.g_selectList.showSelected();
                        LayoutEditor.g_draw(this);
                        isHandled = true;
                        this.isDrawing = false;
                    }

                    break;
            }

            return isHandled || this.isDrawing;
        };

        RotateTool.prototype.onChangeFocus = function (focus) {
        };

        RotateTool.prototype.draw = function (ctx) {
            if (!this.isDrawing)
                return;

            for (var i = 0; i < LayoutEditor.g_selectList.selectedShapes.length; ++i) {
                LayoutEditor.g_selectList.selectedShapes[i].draw(ctx, LayoutEditor.g_panZoom); // draw the shape in the tool context
            }
        };

        RotateTool.prototype.getAngle = function (x, y, px, py) {
            var dx = x - px;
            var dy = y - py;
            if (Math.abs(dy) < LayoutEditor.EPSILON && Math.abs(dx) < LayoutEditor.EPSILON)
                return 0;

            return Math.atan2(dy, dx);
        };
        return RotateTool;
    })();
    LayoutEditor.RotateTool = RotateTool;

    var MoveTool = (function () {
        function MoveTool() {
            this.shape = null;
            this.canUse = false;
            this.deltaX = 0;
            this.deltaY = 0;
            this.oldTransform = new LayoutEditor.Transform();
            this.oldAABB = new LayoutEditor.Bounds();
            this.oldShapeTransforms = [];
        }
        MoveTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 1 /* Start */:
                    this.shape = LayoutEditor.g_shapeList.getShapeInXY(e.x, e.y);

                    if (this.shape) {
                        if (!LayoutEditor.g_selectList.isSelected(this.shape)) {
                            LayoutEditor.g_selectList.setSelectedShapes([this.shape]);
                        }

                        var shapes = LayoutEditor.g_selectList.selectGroup.shapes;
                        for (var i = 0; i < shapes.length; ++i) {
                            this.oldShapeTransforms[i] = shapes[i].transform.clone();
                        }

                        LayoutEditor.g_selectList.hideSelected(); // hide before rebuilding tabs, so we don't include them
                        LayoutEditor.g_grid.rebuildTabs();
                        this.oldTransform.copy(LayoutEditor.g_selectList.selectGroup.transform);
                        this.oldAABB.copy(LayoutEditor.g_selectList.selectGroup.aabb);
                        this.deltaX = 0;
                        this.deltaY = 0;

                        LayoutEditor.g_draw(this);
                        isHandled = true;
                    }
                    break;

                case 2 /* Move */:
                    if (this.shape) {
                        this.deltaX += e.deltaX;
                        this.deltaY += e.deltaY;

                        var delta = this.snapAABBToGrid(this.deltaX, this.deltaY);

                        var moveTransform = LayoutEditor.g_selectList.selectGroup.transform;

                        moveTransform.tx = this.oldTransform.tx + delta.x;
                        moveTransform.ty = this.oldTransform.ty + delta.y;

                        LayoutEditor.g_selectList.selectGroup.calculateBounds();

                        this.canUse = true;

                        LayoutEditor.g_draw(this);
                        isHandled = true;
                    }
                    break;

                case 3 /* End */:
                    if (this.shape && this.canUse) {
                        var newCommand = new LayoutEditor.TransformCommand(LayoutEditor.g_selectList.selectGroup.shapes, this.oldShapeTransforms);
                        LayoutEditor.g_commandList.addCommand(newCommand);
                        LayoutEditor.g_selectList.showSelected();
                        LayoutEditor.g_draw(this);
                        LayoutEditor.g_grid.clearSnap();
                        isHandled = true;
                    }
                    this.canUse = false;
                    this.shape = null;
                    break;
            }

            return isHandled || this.shape !== null;
        };

        MoveTool.prototype.onChangeFocus = function (focus) {
        };

        MoveTool.prototype.draw = function (ctx) {
            if (!this.shape)
                return;

            for (var i = 0; i < LayoutEditor.g_selectList.selectedShapes.length; ++i) {
                LayoutEditor.g_selectList.selectedShapes[i].draw(ctx, LayoutEditor.g_panZoom); // draw the shape in the tool context
            }

            LayoutEditor.g_grid.draw(ctx);
        };

        MoveTool.prototype.snapAABBToGrid = function (dx, dy) {
            // the delta is wrt to the original aabb
            var aabb = this.oldAABB;

            var centerX = aabb.cx + dx;
            var centerY = aabb.cy + dy;
            var left = centerX - aabb.hw;
            var top = centerY - aabb.hh;
            var right = centerX + aabb.hw;
            var bottom = centerY + aabb.hh;

            var delta = {
                x: dx,
                y: dy
            };

            var newLeft = LayoutEditor.g_grid.snapX(left);
            if (left !== newLeft) {
                delta.x += newLeft - left;
            } else {
                var newRight = LayoutEditor.g_grid.snapX(right);
                if (right !== newRight) {
                    delta.x += newRight - right;
                } else {
                    var newCenterX = LayoutEditor.g_grid.snapX(centerX);
                    if (newCenterX !== centerX) {
                        delta.x += newCenterX - centerX;
                    }
                }
            }

            var newTop = LayoutEditor.g_grid.snapY(top);
            if (top !== newTop) {
                delta.y += newTop - top;
            } else {
                var newBottom = LayoutEditor.g_grid.snapY(bottom);
                if (bottom !== newBottom) {
                    delta.y += newBottom - bottom;
                } else {
                    var newCenterY = LayoutEditor.g_grid.snapY(centerY);
                    if (newCenterY !== centerY) {
                        delta.y += newCenterY - centerY;
                    }
                }
            }

            return delta;
        };
        return MoveTool;
    })();
    LayoutEditor.MoveTool = MoveTool;

    var PanZoomTool = (function () {
        function PanZoomTool() {
            this.isDrawing = false;
        }
        PanZoomTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 1 /* Start */:
                    this.isDrawing = true;
                    break;

                case 2 /* Move */:
                    LayoutEditor.g_panZoom.panX += LayoutEditor.g_panZoom.deltaX;
                    LayoutEditor.g_panZoom.panY += LayoutEditor.g_panZoom.deltaY;
                    LayoutEditor.g_draw(LayoutEditor.g_panZoom);
                    isHandled = true;
                    break;

                case 6 /* MouseWheel */:
                    var scale = (LayoutEditor.g_panZoom.deltaY > 0 ? 1 / 1.15 : 1.15);
                    LayoutEditor.g_panZoom.panX += e.x * LayoutEditor.g_panZoom.zoom * (1 - scale);
                    LayoutEditor.g_panZoom.panY += e.y * LayoutEditor.g_panZoom.zoom * (1 - scale);
                    LayoutEditor.g_panZoom.zoom *= scale;

                    LayoutEditor.g_draw(LayoutEditor.g_panZoom);
                    isHandled = true;

                    break;

                case 3 /* End */:
                    this.isDrawing = false;

                    break;
            }

            return this.isDrawing || isHandled;
        };

        PanZoomTool.prototype.onChangeFocus = function (focus) {
        };

        PanZoomTool.prototype.draw = function (ctx) {
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

                        // TODO remove dependency on g_toolCtx
                        var left = this.shape.oabb.cx + LayoutEditor.g_toolCtx.canvas.offsetLeft + "px";
                        var top = this.shape.oabb.cy + LayoutEditor.g_toolCtx.canvas.offsetTop + "px";
                        LayoutEditor.g_inputMultiLine.style.left = left;
                        LayoutEditor.g_inputMultiLine.style.top = top;
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

            return isHandled || this.shape !== null;
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
                LayoutEditor.g_draw(this);
            }
        };

        TextTool.prototype.onInput = function (e) {
            if (this.shape === null)
                return;

            this.editShape.text = LayoutEditor.g_inputMultiLine.value;
            LayoutEditor.g_draw(this);
        };

        TextTool.prototype.draw = function (ctx) {
            if (!this.shape)
                return;

            this.editShape.draw(ctx, LayoutEditor.g_panZoom);
        };
        return TextTool;
    })();
    LayoutEditor.TextTool = TextTool;

    LayoutEditor.g_inputMultiLine = null;

    LayoutEditor.g_toolCtx = null;
})(LayoutEditor || (LayoutEditor = {}));
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    "use strict";

    var StylePanel = (function () {
        function StylePanel() {
            this.canvas = null;
            this.ctx = null;
            this.rootElem = null;
            this.styleShape = new LayoutEditor.RectShape(80, 60);
            this.selected = null;
            this.elems = {};
            this.styleShape.text = "Text";
        }
        StylePanel.prototype.setRootElem = function (elem) {
            this.rootElem = elem;

            var self = this;
            elem.addEventListener("click", function (e) {
                self.onClick(e);
            });

            this.buildHTML();
        };

        StylePanel.prototype.onClick = function (e) {
            var xStyleButton = this.getXStyleButton(e.target);
            if (xStyleButton)
                this.selectStyle(xStyleButton.getAttribute("value"));
        };

        StylePanel.prototype.getXStyleButton = function (target) {
            while (target && target.nodeName !== 'X-STYLEBUTTON')
                target = target.parentNode;

            return target;
        };

        StylePanel.prototype.reset = function () {
            this.buildHTML();
        };

        StylePanel.prototype.refresh = function () {
        };

        StylePanel.prototype.selectStyle = function (styleName) {
            if (this.selected)
                this.selected.classList.remove('selectedStyle');

            this.selected = this.elems[styleName];
            if (this.selected)
                this.selected.classList.add('selectedStyle');
        };

        StylePanel.prototype.buildHTML = function () {
            this.selected = null;

            while (this.rootElem.lastChild)
                this.rootElem.removeChild(this.rootElem.lastChild);

            for (var i = 0; i < LayoutEditor.g_styleList.styles.length; ++i) {
                var newElem = document.createElement('x-styleButton');
                var name = LayoutEditor.g_styleList.styles[i].name;

                newElem.setAttribute('value', name);

                this.rootElem.appendChild(newElem);
                this.elems[name] = newElem;
            }

            if (LayoutEditor.g_styleList.styles.length > 0)
                this.selectStyle(LayoutEditor.g_styleList.styles[0].name);
        };
        return StylePanel;
    })();
    LayoutEditor.StylePanel = StylePanel;

    var XStyleButtonInternal = (function () {
        function XStyleButtonInternal(elem) {
            this.elem = elem;
            this.canvas = null;
            this.ctx = null;
            this.width = 80;
            this.height = 60;
            this.rectShape = new LayoutEditor.RectShape(this.width - 20, this.height - 20);
            this.labelElem = null;
            var shadow = elem.createShadowRoot();

            shadow.innerHTML = '<style>.label {text-align: center; font: bold 12px courier}</style>' + '<canvas></canvas><div class="label"></div></div>';

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
        XStyleButtonInternal.prototype.attributeChanged = function (attrName, oldVal, newVal) {
            this.refresh();
        };

        XStyleButtonInternal.prototype.refresh = function () {
            var styleName = this.elem.getAttribute("value");
            var style = LayoutEditor.g_styleList.getStyle(styleName);
            var ctx = this.ctx;

            if (style !== null)
                this.rectShape.setStyle(style);

            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.rectShape.draw(ctx, LayoutEditor.g_noPanZoom);

            this.labelElem.innerHTML = styleName;
        };
        return XStyleButtonInternal;
    })();

    LayoutEditor.XStyleButton = Object.create(HTMLElement.prototype);

    LayoutEditor.XStyleButton.createdCallback = function () {
        this.internal = new XStyleButtonInternal(this);
    };

    LayoutEditor.XStyleButton.attributeChangedCallback = function (attrName, oldVal, newVal) {
        this.internal.attributeChanged(attrName, oldVal, newVal);
    };

    LayoutEditor.XStyleButton.refresh = function () {
        this.internal.refresh();
    };

    var altDocument = document;
    altDocument.registerElement("x-styleButton", {
        prototype: LayoutEditor.XStyleButton
    });

    LayoutEditor.g_stylePanel = new StylePanel();
})(LayoutEditor || (LayoutEditor = {}));
/// <reference path="interactionhelper.ts" />
/// <reference path="helper.ts" />
/// <reference path="system.ts" />
/// <reference path="webpropertypanel.ts" />
/// <reference path="style.ts" />
/// <reference path="panzoom.ts" />
/// <reference path="screen.ts" />
/// <reference path="shape.ts" />
/// <reference path="select.ts" />
/// <reference path="grid.ts" />
/// <reference path="command.ts" />
/// <reference path="tool.ts" />
/// <reference path="stylepanel.ts" />
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
            if (oldTool)
                oldTool.onChangeFocus(toolName);

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
        LayoutEditor.g_panZoom.reset();
        LayoutEditor.g_styleList.reset();
        LayoutEditor.g_selectList.reset();
        LayoutEditor.g_stylePanel.reset();

        // provide a slide border so we can see the screen box
        LayoutEditor.g_panZoom.panX = -10;
        LayoutEditor.g_panZoom.panY = -10;

        LayoutEditor.g_draw(LayoutEditor.g_shapeList);
        LayoutEditor.g_draw(LayoutEditor.g_screen);
        LayoutEditor.g_draw(LayoutEditor.g_panZoom);
        LayoutEditor.g_draw(LayoutEditor.g_selectList);
        LayoutEditor.g_draw(LayoutEditor.g_stylePanel);
    }

    var focus = "";

    function setFocus(name) {
        if (focus === name)
            return;

        focus = name;
        g_tool.onChangeFocus(name); // TODO make more general
    }

    var requestFrame = false;
    var drawList = [];

    function draw(obj) {
        if (drawList.indexOf(obj) === -1)
            drawList.push(obj);

        if (!requestFrame) {
            requestAnimationFrame(renderFrame);
        }
        requestFrame = true;
    }

    function clear(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    function renderFrame() {
        if (drawList.indexOf(LayoutEditor.g_screen) !== -1 || drawList.indexOf(LayoutEditor.g_shapeList) !== -1 || drawList.indexOf(LayoutEditor.g_panZoom) !== -1) {
            clear(LayoutEditor.g_drawCtx);
            LayoutEditor.g_screen.draw(LayoutEditor.g_drawCtx);
            LayoutEditor.g_shapeList.draw(LayoutEditor.g_drawCtx);
        }

        if (drawList.indexOf(LayoutEditor.g_selectList) !== -1 || drawList.indexOf(LayoutEditor.g_panZoom) !== -1 || drawList.indexOf(g_tool) !== -1) {
            clear(LayoutEditor.g_toolCtx);
            LayoutEditor.g_selectList.draw(LayoutEditor.g_toolCtx);
            g_tool.draw(LayoutEditor.g_toolCtx);
        }

        if (drawList.indexOf(LayoutEditor.g_stylePanel)) {
            LayoutEditor.g_stylePanel.refresh();
        }

        drawList.length = 0;
        requestFrame = false;
    }

    function duplicateSelect() {
        LayoutEditor.g_commandList.addCommand(new LayoutEditor.DuplicateSelectedCommand());
    }

    function deleteSelect() {
        LayoutEditor.g_commandList.addCommand(new LayoutEditor.DeleteSelectedCommand());
    }

    function changePlatform(e) {
        LayoutEditor.g_screen.setPlatform(parseInt(e.target.value));
    }

    function shapesSelect() {
        document.getElementById('layoutShapes').classList.remove('hidden');
        document.getElementById('layoutStyles').classList.add('hidden');
    }

    function stylesSelect() {
        document.getElementById('layoutShapes').classList.add('hidden');
        document.getElementById('layoutStyles').classList.remove('hidden');
    }

    window.addEventListener("load", function () {
        var canvas = document.getElementById("layoutShapes");
        var toolCanvas = document.getElementById("layoutTool");
        var interactionCanvas = document.getElementById("interaction");

        LayoutEditor.g_drawCtx = canvas.getContext("2d");
        LayoutEditor.g_toolCtx = toolCanvas.getContext("2d");

        LayoutEditor.g_draw = draw;

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
        document.getElementById("load").addEventListener("click", loadData);
        document.getElementById("save").addEventListener("click", saveData);
        document.getElementById("duplicate").addEventListener("click", duplicateSelect);
        document.getElementById("delete").addEventListener("click", deleteSelect);
        document.getElementById("shapes").addEventListener("click", shapesSelect);
        document.getElementById("styles").addEventListener("click", stylesSelect);

        var platformSelect = document.getElementById("platform");
        platformSelect.addEventListener("change", changePlatform);
        platformSelect.value = LayoutEditor.g_screen.getPlatform().toString();

        LayoutEditor.g_inputText = document.getElementById("inputText");
        LayoutEditor.g_inputMultiLine = document.getElementById("inputMultiLine");

        // g_propertyTool = new PropertyTool();
        LayoutEditor.g_propertyPanel.setRootElem(document.getElementById("webPropertyPanel"));
        LayoutEditor.g_textPropertyEditor.setInputElem(LayoutEditor.g_inputText);

        LayoutEditor.g_stylePanel.setRootElem(document.getElementById("layoutStyles"));

        setTool("rectTool");
        shapesSelect();

        reset();

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

            g_tool.onPointer(e);
        });
    });
})(LayoutEditor || (LayoutEditor = {}));
