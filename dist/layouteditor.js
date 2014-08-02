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

            var doubleClick = false;
            var timeMS = Date.now();

            if (timeMS - this.tapTimeMS < this.options.DoubleClickTimeMS) {
                if (Math.abs(this.tapPosition.x - x) < this.options.MouseCancelTapDistance && Math.abs(this.tapPosition.y - y) < this.options.MouseCancelTapDistance) {
                    doubleClick = true;
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

            if (doubleClick) {
                event.state = 4 /* DoubleClick */;
                this.onPointerFunc(event);
                event.state = 1 /* Start */;
            }

            this.onPointerFunc(event);

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
            var doubleClick = false;
            var timeMS = Date.now();

            if (timeMS - this.tapTimeMS < this.options.DoubleClickTimeMS) {
                if (Math.abs(this.tapPosition.x - pinch.x) < this.options.TouchCancelTapDistance && Math.abs(this.tapPosition.y - pinch.y) < this.options.TouchCancelTapDistance) {
                    doubleClick = true;
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

            if (doubleClick) {
                event.state = 4 /* DoubleClick */;
                this.onPointerFunc(event);
                event.state = 1 /* Start */;
            }

            this.onPointerFunc(event);

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
// Copyright 2014 Reece Elliott
var Helper;
(function (Helper) {
    var Callback = (function () {
        function Callback() {
            this.list = [];
            this.dead = [];
            this.isProcessing = false;
        }
        Callback.prototype.add = function (callback) {
            this.list.push(callback);
        };

        Callback.prototype.remove = function (callback) {
            if (this.isProcessing) {
                this.dead.push(callback);
            } else {
                // if we're not processing then remove the callback immediately, freeing the dependency
                var index = this.list.indexOf(callback);
                if (index !== -1)
                    this.list.splice(index, 1);
            }
        };

        Callback.prototype.fire = function (params) {
            this.isProcessing = true;

            for (var i = 0; i < this.list.length; i++) {
                var callback = this.list[i];
                var isDead = this.dead.indexOf(callback) !== -1;
                if (!isDead)
                    callback.apply(null, arguments); // use the arguments for apply()
            }

            this.isProcessing = false;

            for (var i = 0; i < this.dead.length; ++i) {
                var deadCallback = this.dead[i];
                var deadIndex = this.list.indexOf(deadCallback);
                if (deadIndex !== -1)
                    this.list.splice(deadIndex, 1);
            }
        };
        return Callback;
    })();
    Helper.Callback = Callback;

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

    function enumList(enumObj) {
        var list = [];
        for (var prop in enumObj) {
            var value = enumObj[prop];
            if (value - parseFloat(value) >= 0) {
                list.push({
                    name: prop,
                    value: value
                });
            }
        }
        return list;
    }
    Helper.enumList = enumList;
})(Helper || (Helper = {}));
// Copyright 2014 Reece Elliott
var LayoutEditor;
(function (LayoutEditor) {
    LayoutEditor.EPSILON = 0.001;

    

    LayoutEditor.g_draw = null;
})(LayoutEditor || (LayoutEditor = {}));
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    var PropertyBinding = (function () {
        function PropertyBinding(objects, prop) {
            this.objects = objects;
            this.prop = prop;
            this.elem = null;
            this.state = "";
            this.editor = null;
            this.item = null;
        }
        PropertyBinding.prototype.isValueSame = function () {
            var objects = this.objects;
            if (objects.length === 0)
                return false;

            var value = objects[0][this.prop];
            for (var i = 1; i < objects.length; ++i) {
                if (objects[i][this.prop] !== value)
                    return false;
            }

            return true;
        };

        PropertyBinding.prototype.getValue = function () {
            if (this.objects.length > 0)
                return this.objects[0][this.prop];

            return undefined;
        };

        PropertyBinding.prototype.setValue = function (value) {
            for (var i = 0; i < this.objects.length; ++i)
                this.objects[i][this.prop] = value;
        };
        return PropertyBinding;
    })();
    LayoutEditor.PropertyBinding = PropertyBinding;

    var PropertyPanel = (function () {
        function PropertyPanel() {
            this.objects = [];
            this.propertyLists = [];
            this.width = 0;
            this.rootElem = null;
            this.editing = null;
            this.clickHandler = null;
            this.bindings = [];
            this.editors = [];
            this.onChangeCallback = null;
            this.clickHandler = this.onClick.bind(this);
        }
        PropertyPanel.prototype.reset = function () {
            this.objects.length = 0;
            this.editing = null;
            this.bindings.length = 0;
            this.onChangeCallback = null;
        };

        PropertyPanel.prototype.isArraySame = function (a, b) {
            if (a.length !== b.length)
                return false;

            for (var i = 0; i < a.length; ++i) {
                if (a[i] !== b[i])
                    return false;
            }

            return true;
        };

        PropertyPanel.prototype.setRootElem = function (rootElem) {
            if (this.rootElem) {
                this.rootElem.removeEventListener("click", this.clickHandler);
            }

            this.rootElem = rootElem;
            this.rootElem.addEventListener("click", this.clickHandler);
        };

        PropertyPanel.prototype.setObjects = function (objects, onChangeCallback) {
            if (!this.isArraySame(this.objects, objects)) {
                this.commitEditing();

                this.objects = objects;
                this.onChangeCallback = onChangeCallback;
                this.bindings.length = 0;

                var rootElem = this.rootElem;
                while (rootElem.lastChild) {
                    rootElem.removeChild(rootElem.lastChild);
                }

                if (objects.length > 0)
                    this.createBinding(objects, "", "object", null, this.rootElem);
            }

            this.refresh();
        };

        PropertyPanel.prototype.addPropertyList = function (propertyList) {
            this.propertyLists.push(propertyList);
        };

        PropertyPanel.prototype.getPropertyList = function (objects) {
            if (objects.length === 0)
                return null;

            for (var i = this.propertyLists.length - 1; i >= 0; --i) {
                var thisList = this.propertyLists[i];
                var canHandleAll = true;

                for (var j = 0; canHandleAll && j < objects.length; ++j)
                    canHandleAll = thisList.canHandle(objects[j]);

                if (canHandleAll)
                    return thisList;
            }
            return null;
        };

        PropertyPanel.prototype.refresh = function () {
            for (var i = 0; i < this.bindings.length; ++i) {
                var binding = this.bindings[i];
                binding.editor.refresh(binding);
            }
        };

        PropertyPanel.prototype.onClick = function (e) {
            var elem = e.target;
            var idString = "";
            while (elem && !elem.hasAttribute("data-id"))
                elem = elem.parentNode;

            if (!elem)
                return;

            var id = parseInt(elem.getAttribute("data-id"));
            var binding = this.bindings[id];
            if (binding) {
                this.startEditing(binding);
            }
        };

        PropertyPanel.prototype.startEditing = function (binding) {
            if (this.editing === binding)
                return;

            if (this.editing)
                this.commitEditing();

            this.editing = binding;
            binding.editor.startEdit(binding);
        };

        PropertyPanel.prototype.commitEditing = function () {
            var binding = this.editing;
            if (!binding)
                return;

            binding.editor.commitEdit(binding);
            if (this.onChangeCallback !== null)
                this.onChangeCallback();

            this.editing = null;
        };

        PropertyPanel.prototype.addEditor = function (editor) {
            this.editors.push(editor);
        };

        PropertyPanel.prototype.createBinding = function (objects, prop, editorType, propItem, parentElem) {
            var binding = new PropertyBinding(objects, prop);
            this.bindings.push(binding);

            var id = this.bindings.length - 1;

            for (var i = this.editors.length - 1; i >= 0; --i) {
                var editor = this.editors[i];
                if (editor.canEdit(editorType)) {
                    binding.editor = editor;
                    binding.item = propItem;

                    var elem = editor.createElement(parentElem, binding);
                    binding.elem = elem;

                    if (elem)
                        elem.setAttribute("data-id", id.toString());
                    break;
                }
            }

            return binding;
        };
        return PropertyPanel;
    })();
    LayoutEditor.PropertyPanel = PropertyPanel;

    var TextPropertyEditor = (function () {
        function TextPropertyEditor() {
            this.regExp = null;
        }
        TextPropertyEditor.prototype.setInputElem = function (elem) {
            elem.classList.add("inputText");

            elem.addEventListener("change", this.onChange.bind(this));
            elem.addEventListener("input", this.onInput.bind(this));

            this.inputText = elem;
        };

        TextPropertyEditor.prototype.canEdit = function (type) {
            return type === "string" || type === "number";
        };

        TextPropertyEditor.prototype.createElement = function (parentElem, binding) {
            var textDiv = document.createElement("div");
            textDiv.classList.add("propertyText");
            var nameSpan = document.createElement("span");
            var valueSpan = document.createElement("span");

            nameSpan.innerHTML = binding.prop + ": ";

            textDiv.appendChild(nameSpan);
            textDiv.appendChild(valueSpan);

            binding.elem = textDiv;
            this.refresh(binding);

            parentElem.appendChild(textDiv);

            return textDiv;
        };

        TextPropertyEditor.prototype.refresh = function (binding) {
            var valueSpan = binding.elem.lastChild;
            var value = binding.getValue();
            if (!binding.isValueSame())
                value = "----";

            valueSpan.innerHTML = value;
        };

        TextPropertyEditor.prototype.startEdit = function (binding) {
            var rectObject = binding.elem.lastChild.getBoundingClientRect();

            var value = binding.getValue();
            if (!binding.isValueSame())
                value = "----";

            this.inputText.style.top = rectObject.top + "px";
            this.inputText.style.left = rectObject.left + "px";
            this.inputText.value = value.toString();
            this.inputText.type = "input";

            this.inputText.setSelectionRange(0, LayoutEditor.g_inputText.value.length);
            this.inputText.focus();

            if (typeof binding.item.match !== "undefined")
                this.regExp = new RegExp(binding.item.match);
        };

        TextPropertyEditor.prototype.commitEdit = function (binding) {
            if (typeof binding.item.isValid === "undefined" || binding.item.isValid(LayoutEditor.g_inputText.value)) {
                binding.setValue(LayoutEditor.g_inputText.value);
            }

            this.inputText.blur();
            this.inputText.type = "hidden";
            this.regExp = null;

            this.refresh(binding);
        };

        TextPropertyEditor.prototype.onChange = function (e) {
            LayoutEditor.g_propertyPanel.commitEditing();
        };

        TextPropertyEditor.prototype.onInput = function (e) {
            if (this.regExp === null)
                return;

            if (!this.regExp.test(LayoutEditor.g_inputText.value)) {
                this.inputText.style.color = "red";
            } else {
                this.inputText.style.color = "black";
            }
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

        ObjectPropertyEditor.prototype.getType = function (item, objects) {
            if (objects.length === 0)
                return undefined;

            return item.type || typeof objects[0][item.prop];
        };

        ObjectPropertyEditor.prototype.createElement = function (parentElem, binding) {
            var objectElem = null;
            var objects = binding.objects;

            if (binding.prop.length !== 0) {
                // this is a sub-element
                binding.state = "closed";
                objectElem = document.createElement("div");
                objectElem.innerHTML = binding.prop;
                objectElem.classList.add("propertyObject");
                objectElem.setAttribute("data-state", binding.state);

                parentElem.appendChild(objectElem);
                parentElem = objectElem; // make this the new parent

                for (var i = 0; i < objects.length; ++i) {
                    objects[i] = objects[i][binding.prop];
                }
            }

            var propertyList = LayoutEditor.g_propertyPanel.getPropertyList(objects);

            for (var i = 0; i < propertyList.items.length; ++i) {
                var propItem = propertyList.items[i];
                var prop = propItem.prop;
                var type = this.getType(propItem, objects);

                if (propItem.allowMultiple === false && objects.length !== 1)
                    continue;

                LayoutEditor.g_propertyPanel.createBinding(objects, prop, type, propItem, parentElem);
            }

            return objectElem;
        };

        ObjectPropertyEditor.prototype.refresh = function (binding) {
            // do nothing
        };

        ObjectPropertyEditor.prototype.startEdit = function (binding) {
            var wasOpen = (binding.elem.getAttribute("data-state") === "open");
            binding.state = wasOpen ? "closed" : "open";
            binding.elem.setAttribute("data-state", binding.state);
        };

        ObjectPropertyEditor.prototype.commitEdit = function (binding) {
            // do nothing
        };
        return ObjectPropertyEditor;
    })();
    LayoutEditor.ObjectPropertyEditor = ObjectPropertyEditor;

    var ListPropertyEditor = (function () {
        function ListPropertyEditor() {
        }
        // returns true if we can edit this type of property
        ListPropertyEditor.prototype.canEdit = function (type) {
            return type === "list";
        };

        // creates an element for this binding
        ListPropertyEditor.prototype.createElement = function (parentElem, binding) {
            var textDiv = document.createElement("div");
            textDiv.classList.add("propertyText");
            var nameSpan = document.createElement("span");
            var valueSpan = document.createElement("span");

            nameSpan.innerHTML = binding.prop + ": ";

            textDiv.appendChild(nameSpan);
            textDiv.appendChild(valueSpan);

            binding.elem = textDiv;
            this.refresh(binding);

            parentElem.appendChild(textDiv);

            return textDiv;
        };

        // refreshes the element in binding
        ListPropertyEditor.prototype.refresh = function (binding) {
            var valueSpan = binding.elem.lastChild;

            if (!binding.isValueSame()) {
                valueSpan.innerHTML = "----";
            } else {
                value = binding.getValue();

                var list = binding.item.getList();
                var value = binding.getValue();

                for (var i = 0; i < list.length; ++i) {
                    if (list[i].value === value) {
                        valueSpan.innerHTML = list[i].name;
                        break;
                    }
                }
            }
        };

        // edits the element in binding
        ListPropertyEditor.prototype.startEdit = function (binding) {
            var rectObject = binding.elem.lastChild.getBoundingClientRect();

            var list = binding.item.getList();
            var value = binding.getValue();
            if (!binding.isValueSame())
                value = "----";

            var inputSelect = document.createElement("select");
            inputSelect.classList.add("inputSelect");

            for (var i = 0; i < list.length; ++i) {
                var item = list[i];
                var option = document.createElement("option");

                option.setAttribute("value", item.name);
                option.innerHTML = item.name;
                if (value == item.value)
                    option.setAttribute("selected", "selected");

                inputSelect.appendChild(option);
            }
            binding.elem.appendChild(inputSelect);

            var sizeStr = Math.min(10, list.length).toString();

            inputSelect.style.top = rectObject.top + "px";
            inputSelect.style.left = rectObject.left + "px";
            inputSelect.setAttribute("size", sizeStr);
            inputSelect.setAttribute("expandto", sizeStr);
            inputSelect.addEventListener("change", this.onChange.bind(this));
            inputSelect.focus();
        };

        ListPropertyEditor.prototype.onChange = function (e) {
            LayoutEditor.g_propertyPanel.commitEditing();
        };

        // stops editing the element in binding and commits the result
        ListPropertyEditor.prototype.commitEdit = function (binding) {
            var inputSelect = binding.elem.lastChild;
            var list = binding.item.getList();
            var value = list[inputSelect.selectedIndex].value;

            if (typeof binding.item.isValid === "undefined" || binding.item.isValid(value)) {
                binding.setValue(value);
            }

            binding.elem.removeChild(inputSelect);

            this.refresh(binding);
        };
        return ListPropertyEditor;
    })();
    LayoutEditor.ListPropertyEditor = ListPropertyEditor;

    LayoutEditor.g_propertyPanel = new PropertyPanel();

    LayoutEditor.g_textPropertyEditor = new TextPropertyEditor();

    LayoutEditor.g_propertyPanel.addEditor(LayoutEditor.g_textPropertyEditor);
    LayoutEditor.g_propertyPanel.addEditor(new ObjectPropertyEditor());
    LayoutEditor.g_propertyPanel.addEditor(new ListPropertyEditor());

    LayoutEditor.g_inputText = null;
})(LayoutEditor || (LayoutEditor = {}));
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    (function (StyleTextAlign) {
        StyleTextAlign[StyleTextAlign["center"] = 0] = "center";
        StyleTextAlign[StyleTextAlign["left"] = 1] = "left";
        StyleTextAlign[StyleTextAlign["right"] = 2] = "right";
    })(LayoutEditor.StyleTextAlign || (LayoutEditor.StyleTextAlign = {}));
    var StyleTextAlign = LayoutEditor.StyleTextAlign;

    (function (StyleTextBaseline) {
        StyleTextBaseline[StyleTextBaseline["top"] = 0] = "top";
        StyleTextBaseline[StyleTextBaseline["middle"] = 1] = "middle";
        StyleTextBaseline[StyleTextBaseline["bottom"] = 2] = "bottom";
    })(LayoutEditor.StyleTextBaseline || (LayoutEditor.StyleTextBaseline = {}));
    var StyleTextBaseline = LayoutEditor.StyleTextBaseline;

    (function (StyleFontWeight) {
        StyleFontWeight[StyleFontWeight["normal"] = 0] = "normal";
        StyleFontWeight[StyleFontWeight["bold"] = 1] = "bold";
        StyleFontWeight[StyleFontWeight["bolder"] = 2] = "bolder";
        StyleFontWeight[StyleFontWeight["lighter"] = 3] = "lighter";
    })(LayoutEditor.StyleFontWeight || (LayoutEditor.StyleFontWeight = {}));
    var StyleFontWeight = LayoutEditor.StyleFontWeight;

    (function (StyleFontStyle) {
        StyleFontStyle[StyleFontStyle["normal"] = 0] = "normal";
        StyleFontStyle[StyleFontStyle["italic"] = 1] = "italic";
        StyleFontStyle[StyleFontStyle["oblique"] = 2] = "oblique";
    })(LayoutEditor.StyleFontStyle || (LayoutEditor.StyleFontStyle = {}));
    var StyleFontStyle = LayoutEditor.StyleFontStyle;

    //------------------------------
    var Style = (function () {
        function Style(name) {
            this.name = "";
            this.strokeColor = "black";
            this.fillColor = "none";
            this.lineWidth = 1;
            this.lineDash = [];
            this.textAlign = 0 /* center */;
            this.textBaseline = 1 /* middle */;
            this.fontSize = 20;
            this.fontFamily = "arial";
            this.fontWeight = 0 /* normal */;
            this.fontStyle = 0 /* normal */;
            this.fontColor = "black";
            this.fontSpacing = 1;
            if (typeof name === "undefined")
                this.name = "Style" + Style.uniqueID++;
            else
                this.name = name;
        }
        Style.prototype.drawShape = function (ctx) {
            if (ctx.strokeStyle !== this.strokeColor)
                ctx.strokeStyle = this.strokeColor;
            if (ctx.fillStyle !== this.fillColor)
                ctx.fillStyle = this.fillColor;
            if (ctx.lineWidth !== this.lineWidth.toString())
                ctx.lineWidth = this.lineWidth.toString();
            ctx.setLineDash(this.lineDash);
        };

        Style.prototype.drawFont = function (ctx) {
            var textAlign = StyleTextAlign[this.textAlign];
            if (ctx.textAlign !== textAlign)
                ctx.textAlign = textAlign;

            var textBaseline = StyleTextBaseline[this.textBaseline];
            if (ctx.textBaseline !== textBaseline)
                ctx.textBaseline = textBaseline;

            if (ctx.fillStyle !== this.fontColor)
                ctx.fillStyle = this.fontColor;

            var font = StyleFontWeight[this.fontWeight] + " " + StyleFontStyle[this.fontStyle] + ' ' + this.fontSize + "px " + this.fontFamily;
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
    LayoutEditor.g_drawStyle = new Style("_draw");
    LayoutEditor.g_selectStyle = new Style("_select");
    LayoutEditor.g_snapStyle = new Style("_snap");

    LayoutEditor.g_drawStyle.strokeColor = "red";
    LayoutEditor.g_drawStyle.lineDash = [2, 2];
    LayoutEditor.g_selectStyle.strokeColor = "blue";
    LayoutEditor.g_selectStyle.lineDash = [5, 5];
    LayoutEditor.g_selectStyle.fontColor = "blue";
    LayoutEditor.g_snapStyle.strokeColor = "red";

    LayoutEditor.g_style = null;

    var StyleList = (function () {
        function StyleList() {
            this.styles = [];
            this.reset();
        }
        StyleList.prototype.reset = function () {
            this.styles.length = 0;

            var defaultStyle = new Style("default");
            defaultStyle.fillColor = "white";

            var defaultStyle2 = new Style("default2");
            defaultStyle2.fillColor = "none";
            defaultStyle2.lineWidth = 2;
            defaultStyle2.strokeColor = "green";
            defaultStyle2.textAlign = 1 /* left */;
            defaultStyle2.fontSize = 15;
            defaultStyle2.fontColor = "green";

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
            var styleName = newStyle.name;

            Helper.extend(newStyle, style);
            newStyle.name = styleName;

            this.styles.push(newStyle);

            return newStyle;
        };

        StyleList.prototype.addStyle = function (newStyle) {
            this.styles.push(newStyle);
        };

        StyleList.prototype.removeStyle = function (style) {
            var index = this.styles.indexOf(style);
            if (index !== -1)
                this.styles.splice(index, 1);
            return index !== -1;
        };

        StyleList.prototype.isValidStyleName = function (styleName) {
            for (var i = 0; i < this.styles.length; ++i) {
                if (this.styles[i].name === styleName)
                    return false;
            }
            return true;
        };

        StyleList.prototype.saveData = function () {
            var obj = {
                type: "StyleList",
                styles: []
            };

            for (var i = 0; i < this.styles.length; ++i) {
                obj.styles.push(this.styles[i].saveData());
            }

            return obj;
        };

        StyleList.prototype.loadData = function (obj) {
            Helper.assert(obj.type === "StyleList");

            this.reset();
            this.styles.length = 0; // we will load the default style

            for (var i = 0; i < obj.styles.length; ++i) {
                var style = new Style();
                style.loadData(obj.styles[i]);
                this.styles.push(style);
            }

            LayoutEditor.g_style = this.getStyle("default");
        };

        StyleList.prototype.getList = function () {
            var items = [];
            for (var i = 0; i < this.styles.length; i++) {
                var style = this.styles[i];
                items.push({
                    value: style,
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
                prop: 'name',
                match: '^[a-zA-Z]\\w*$',
                allowMultiple: false,
                isValid: function (value) {
                    return LayoutEditor.g_styleList.isValidStyleName(value);
                }
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
                getList: function () {
                    return Helper.enumList(StyleTextAlign);
                }
            }, {
                prop: "textBaseline",
                type: 'list',
                getList: function () {
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
                getList: function () {
                    return Helper.enumList(StyleFontWeight);
                }
            }, {
                prop: "fontStyle",
                type: 'list',
                getList: function () {
                    return Helper.enumList(StyleFontStyle);
                }
            }, {
                prop: "fontColor",
                match: '^[a-zA-Z]*$|^#[A-Fa-f0-9]*$'
            }, {
                prop: 'fontSpacing'
            }]
    });
})(LayoutEditor || (LayoutEditor = {}));
// Copyright 2014 Reece Elliott
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
        PanZoom.none = new PanZoom();
        return PanZoom;
    })();
    LayoutEditor.PanZoom = PanZoom;
})(LayoutEditor || (LayoutEditor = {}));
// Copyright 2014 Reece Elliott
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
            this.screenChanged = new Helper.Callback();
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
                this.screenChanged.fire(screenType);
            }
        };

        Screen.prototype.getPlatform = function () {
            return this.screenType.platform;
        };

        Screen.prototype.draw = function (ctx, panZoom) {
            if (!this.screenType)
                return;

            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;
            ctx.setLineDash([]);

            ctx.save();
            panZoom.transform(ctx);

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
})(LayoutEditor || (LayoutEditor = {}));
// Copyright 2014 Reece Elliott
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
            this.oabb = new Bounds();
            this.aabb = new Bounds();
            this.transform = new Transform();
            this.name = "";
            this.text = "";
            this.layer = null;
            this.onChanged = new Helper.Callback();
            if (typeof name === "undefined" || name.length === 0)
                this.makeUnique();
            else
                this.name = name;
        }
        Shape.prototype.makeUnique = function () {
            this.name = "Shape" + Shape.uniqueID++;
        };

        Shape.prototype.refresh = function () {
            this.calculateBounds();
        };

        Shape.prototype.draw = function (ctx, panZoom) {
            this.style.drawShape(ctx);

            this.buildPath(ctx, panZoom);

            if (this.style.fillColor !== "none")
                ctx.fill();
            if (this.style.strokeColor !== "none")
                ctx.stroke();

            this.drawText(ctx, panZoom);
        };

        // implemented in the derived class
        Shape.prototype.buildPath = function (ctx, panZoom) {
        };

        Shape.prototype.drawSelect = function (ctx, panZoom) {
            var oabb = this.oabb;
            ctx.save();
            panZoom.transform(ctx, oabb.cx, oabb.cy, oabb.rotate);
            ctx.beginPath();
            ctx.rect(-oabb.hw, -oabb.hh, oabb.hw * 2, oabb.hh * 2);
            ctx.restore();
            ctx.stroke();
        };

        Shape.prototype.drawAABB = function (ctx, panZoom) {
            var aabb = this.aabb;
            ctx.save();
            panZoom.transform(ctx);
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
                case 0 /* top */:
                    y = -hh;
                    break;
                case 1 /* middle */:
                    y = (lineHeight - textHeight) * 0.5;
                    break;
                case 2 /* bottom */:
                    y = hh - textHeight + lineHeight;
                    break;
            }

            switch (this.style.textAlign) {
                case 1 /* left */:
                    x = -hw;
                    break;
                case 2 /* right */:
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
            this.buildPath(ctx, LayoutEditor.PanZoom.none);
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

        Shape.prototype.copy = function (other) {
            this.style = other.style;
            this.oabb.copy(other.oabb);
            this.aabb.copy(other.aabb);
            this.transform.copy(other.transform);
            this.name = other.name;
            this.text = other.text;
            this.layer = other.layer;
        };

        Shape.prototype.clone = function () {
            var shape = new Shape();
            shape.copy(this);
            return shape;
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
        Shape.uniqueID = 1;
        return Shape;
    })();
    LayoutEditor.Shape = Shape;

    var RectShape = (function (_super) {
        __extends(RectShape, _super);
        function RectShape(name, w, h) {
            _super.call(this, name);
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

        RectShape.prototype.copy = function (other) {
            _super.prototype.copy.call(this, other);
            this.w = other.w;
            this.h = other.h;
        };

        RectShape.prototype.clone = function () {
            var shape = new RectShape(this.name, this.w, this.h);
            shape.copy(this);
            return shape;
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
        function EllipseShape(name, rx, ry) {
            _super.call(this, name);
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

        EllipseShape.prototype.copy = function (other) {
            _super.prototype.copy.call(this, other);
            this.rx = other.rx;
            this.ry = other.ry;
        };

        EllipseShape.prototype.clone = function () {
            var shape = new EllipseShape(this.name, this.rx, this.ry);
            shape.copy(this);
            return shape;
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
        AABBShape.prototype.copy = function (other) {
            _super.prototype.copy.call(this, other);
            this.x1 = other.x1;
            this.y1 = other.y1;
            this.x2 = other.x2;
            this.y2 = other.y2;
        };

        AABBShape.prototype.clone = function () {
            var shape = new AABBShape();
            shape.copy(this);
            return shape;
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

        GroupShape.prototype.copy = function (other) {
            _super.prototype.copy.call(this, other);
            this.lastTransform.copy(other.lastTransform);

            for (var i = 0; i < this.shapes.length; ++i) {
                this.oldTransforms[i] = new Transform();
                this.oldTransforms[i].copy(other.oldTransforms[i]);
                this.shapes[i] = other.shapes[i].clone();
            }
        };

        GroupShape.prototype.clone = function () {
            var shape = new GroupShape();
            shape.copy(this);
            return shape;
        };

        // shapes in this group will be drawn independently
        GroupShape.prototype.draw = function (ctx, panZoom) {
        };

        // use a standard draw for the subelements, when selected
        GroupShape.prototype.drawSelect = function (ctx, panZoom) {
            if (this.shapes.length === 0)
                return;

            // draw the bounds
            LayoutEditor.g_selectStyle.drawShape(ctx);
            _super.prototype.drawSelect.call(this, ctx, panZoom);
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

    LayoutEditor.g_propertyPanel.addPropertyList({
        canHandle: function (obj) {
            return obj instanceof Shape;
        },
        items: [
            {
                prop: 'name',
                match: '^[a-zA-Z]\\w*$',
                allowMultiple: false
            }, {
                prop: 'style',
                type: 'list',
                getList: function () {
                    return LayoutEditor.g_styleList.getList();
                }
            }]
    });
})(LayoutEditor || (LayoutEditor = {}));
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    //------------------------------
    var Layer = (function () {
        function Layer(name) {
            if (typeof name === "undefined") { name = ""; }
            this.name = name;
            this.shapes = [];
            this.id = 0;
            this.ctx = null;
            this.canvas = null;
            this.id = Layer.uniqueID++;
        }
        Layer.prototype.reset = function () {
            this.shapes.length = 0;
        };

        Layer.prototype.createCanvas = function (parentElem, width, height) {
            this.canvas = document.createElement("canvas");
            this.canvas.classList.add("layout");
            this.canvas.setAttribute("data-id", this.id);
            this.canvas.width = width;
            this.canvas.height = height;
            this.ctx = this.canvas.getContext("2d");
            if (parentElem !== null)
                parentElem.appendChild(this.canvas);
        };

        Layer.prototype.destroyCanvas = function (parentElem) {
            if (parentElem) {
                var oldElem = parentElem.querySelector('canvas[data-id="' + this.id + '"]');
                if (oldElem !== null)
                    parentElem.removeChild(oldElem);
            }
        };

        Layer.prototype.draw = function (panZoom) {
            this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
            for (var i = 0; i < this.shapes.length; ++i)
                this.shapes[i].draw(this.ctx, panZoom);
        };

        Layer.prototype.addShapes = function (shapes) {
            for (var i = 0; i < shapes.length; ++i)
                this.addShape(shapes[i]);
        };

        Layer.prototype.removeShapes = function (shapes) {
            for (var i = 0; i < shapes.length; ++i)
                this.removeShape(shapes[i]);
        };

        Layer.prototype.addShape = function (shape) {
            var shapeIndex = this.shapes.indexOf(shape);
            if (shapeIndex !== -1)
                return;

            if (shape.layer !== null)
                shape.layer.removeShape(shape);

            this.shapes.push(shape);
            shape.layer = this;
        };

        Layer.prototype.removeShape = function (shape) {
            shape.layer = null;

            var shapeIndex = this.shapes.indexOf(shape);
            if (shapeIndex !== -1)
                this.shapes.splice(shapeIndex, 1);
        };

        Layer.prototype.duplicateShape = function (shape) {
            var newShape = shape.clone();
            newShape.makeUnique();

            this.addShape(newShape);
            return newShape;
        };

        Layer.prototype.getShapeInXY = function (x, y) {
            for (var i = this.shapes.length - 1; i >= 0; --i) {
                var shape = this.shapes[i];
                if (shape.isInsideXY(this.ctx, x, y))
                    return shape;
            }

            return null;
        };

        Layer.prototype.getShapesInBounds = function (bounds) {
            var shapes = [];

            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                if (shape.isOverlapBounds(bounds)) {
                    shape.isOverlapBounds(bounds);
                    shapes.push(shape);
                }
            }

            return shapes;
        };

        Layer.prototype.createShape = function (type) {
            switch (type) {
                case "RectShape":
                    return new LayoutEditor.RectShape("", 0, 0);
                case "EllipseShape":
                    return new LayoutEditor.EllipseShape("", 0, 0);
                case "AABBShape":
                    return new LayoutEditor.AABBShape();
            }
        };

        Layer.prototype.saveData = function () {
            var obj = {
                type: "layer",
                name: this.name,
                shapes: []
            };
            for (var i = 0; i < this.shapes.length; ++i) {
                var shape = this.shapes[i];
                obj.shapes.push(shape.saveData());
            }
            return obj;
        };

        Layer.prototype.loadData = function (obj) {
            Helper.assert(obj.type === "layer");

            this.reset();
            this.name = obj.name;

            for (var i = 0; i < obj.shapes.length; ++i) {
                var shapeSave = obj.shapes[i];
                var newShape = this.createShape(shapeSave.type);

                newShape.loadData(shapeSave);
                newShape.refresh();

                this.addShape(newShape);
            }
        };
        Layer.uniqueID = 1;
        return Layer;
    })();
    LayoutEditor.Layer = Layer;
})(LayoutEditor || (LayoutEditor = {}));
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    //------------------------------
    var Page = (function () {
        function Page() {
            this.layers = [];
            this.width = 0;
            this.height = 0;
            this.parentElem = null;
            this.panZoom = new LayoutEditor.PanZoom();
            this.requestDrawList = [];
        }
        Page.prototype.setRootElem = function (parentElem, width, height) {
            this.parentElem = parentElem;
            this.width = width;
            this.height = height;

            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].createCanvas(parentElem, this.width, this.height);
        };

        Page.prototype.reset = function () {
            for (var i = 0; i < this.layers.length; ++i)
                this.layers[i].destroyCanvas(this.parentElem);

            this.layers.length = 0;
            this.panZoom.reset();
        };

        Page.prototype.refresh = function () {
            // do nothing
        };

        Page.prototype.requestDraw = function (layer) {
            var index = this.requestDrawList.indexOf(layer);
            if (index !== -1)
                return;

            this.requestDrawList.push(layer);
            if (this.requestDrawList.length !== 1)
                return;

            var self = this;
            requestAnimationFrame(function () {
                for (var i = 0; i < self.requestDrawList.length; ++i) {
                    self.draw(self.requestDrawList[i]);
                }
                self.requestDrawList.length = 0;
            });
        };

        Page.prototype.draw = function (layer) {
            if (typeof layer === "undefined") {
                for (var i = 0; i < this.layers.length; ++i)
                    this.layers[i].draw(this.panZoom);
            } else {
                layer.draw(this.panZoom);
            }
        };

        Page.prototype.addLayer = function (layer) {
            this.layers.push(layer);
            layer.createCanvas(this.parentElem, this.width, this.height);
        };

        Page.prototype.removeLayer = function (layer) {
            var index = this.layers.indexOf(layer);
            if (index !== -1) {
                this.layers[index].destroyCanvas(this.parentElem);
                this.layers.splice(index, 1);
            }
        };

        Page.prototype.isValidShapeName = function (shapeName) {
            for (var j = 0; j < this.layers.length; ++j) {
                var layer = this.layers[j];

                for (var i = 0; i < layer.shapes.length; ++i) {
                    if (layer.shapes[i].name === shapeName)
                        return false;
                }
            }
            return true;
        };

        Page.prototype.saveData = function () {
            var obj = {
                type: "page",
                panZoom: this.panZoom.saveData(),
                layers: []
            };
            for (var i = 0; i < this.layers.length; ++i) {
                obj.layers.push(this.layers[i].saveData());
            }
            return obj;
        };

        Page.prototype.loadData = function (obj) {
            Helper.assert(obj.type === "page");

            this.reset();
            this.panZoom.loadData(obj.panZoom);

            for (var i = 0; i < obj.layers.length; ++i) {
                var layerSave = obj.layers[i];
                var newLayer = new LayoutEditor.Layer();
                newLayer.loadData(layerSave);
                this.addLayer(newLayer);
            }
        };
        return Page;
    })();
    LayoutEditor.Page = Page;
})(LayoutEditor || (LayoutEditor = {}));
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    //------------------------------
    var SelectList = (function () {
        function SelectList() {
            this.selectedShapes = [];
            this.selectGroup = new LayoutEditor.GroupShape("Select");
            this.layer = null;
            this.selectChanged = new Helper.Callback();
        }
        SelectList.prototype.setLayer = function (layer) {
            this.layer = layer;
        };

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
            for (var i = 0; i < this.selectedShapes.length; ++i) {
                var shape = this.selectedShapes[i];
                shape.layer.removeShape(shape);
            }
            this.selectedShapes.length = 0;

            this.rebuildSelectGroup();
        };

        // duplicates all of the selected shapes
        SelectList.prototype.duplicateSelected = function () {
            var copyShapes = [];
            for (var i = 0; i < this.selectedShapes.length; ++i) {
                var shape = this.selectedShapes[i];
                var copyShape = shape.layer.duplicateShape(shape);
                copyShape.transform.tx += 20;
                copyShape.calculateBounds();
                copyShapes.push(copyShape);
            }

            this.rebuildSelectGroup();
            return copyShapes;
        };

        SelectList.prototype.draw = function (ctx, panZoom) {
            this.selectGroup.drawSelect(ctx, panZoom);
        };

        SelectList.prototype.rebuildSelectGroup = function () {
            this.selectGroup.reset();
            this.selectGroup.setShapes(this.selectedShapes);
            this.selectChanged.fire(this.selectedShapes);
        };
        return SelectList;
    })();
    LayoutEditor.SelectList = SelectList;
})(LayoutEditor || (LayoutEditor = {}));
// Copyright 2014 Reece Elliott
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

        Grid.prototype.rebuildTabs = function (layers, excludeShapes) {
            if (typeof excludeShapes === "undefined") { excludeShapes = []; }
            if (!this.snapToShape)
                return;

            this.xTabs.length = 0;
            this.yTabs.length = 0;

            for (var j = 0; j < layers.length; ++j) {
                var layer = layers[j];

                for (var i = 0; i < layer.shapes.length; ++i) {
                    var shape = layer.shapes[i];
                    if (excludeShapes.indexOf(shape) !== -1)
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
            }
        };

        Grid.prototype.draw = function (ctx, panZoom) {
            if (this.snappedX !== undefined || this.snappedY !== undefined) {
                LayoutEditor.g_snapStyle.drawShape(ctx);

                ctx.save();
                panZoom.transform(ctx);

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
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    //------------------------------
    var ToolLayer = (function (_super) {
        __extends(ToolLayer, _super);
        function ToolLayer() {
            _super.call(this);
            this.screen = new LayoutEditor.Screen();
            this.selectList = new LayoutEditor.SelectList();
            this.grid = new LayoutEditor.Grid();
            this.commandList = new LayoutEditor.CommandList();
            this.style = null;
            this.page = null;
            this.hasRequestDraw = false;
            this._layer = null;

            var self = this;
            this.screen.screenChanged.add(function (screenType) {
                self.draw();
            });
        }
        Object.defineProperty(ToolLayer.prototype, "layer", {
            get: function () {
                return this._layer;
            },
            set: function (val) {
                this._layer = val;
                this.selectList.layer = val;
            },
            enumerable: true,
            configurable: true
        });

        ToolLayer.prototype.reset = function () {
            //this.screen.reset();
            this.selectList.reset();

            //this.grid.reset();
            this.commandList.reset();

            //this.style.reset();
            this.style = LayoutEditor.g_styleList.styles[0]; // HACK
        };

        ToolLayer.prototype.draw = function () {
            var panZoom = this.page.panZoom;
            _super.prototype.draw.call(this, panZoom); // must be first, clears the ctx

            var ctx = this.ctx;
            this.screen.draw(ctx, panZoom);
            this.grid.draw(ctx, panZoom);
            this.selectList.draw(ctx, panZoom);
            this.hasRequestDraw = false;
        };

        ToolLayer.prototype.undo = function () {
            this.commandList.undo();
        };

        ToolLayer.prototype.redo = function () {
            this.commandList.redo();
        };

        ToolLayer.prototype.requestDraw = function () {
            if (this.hasRequestDraw)
                return;
            this.hasRequestDraw = true;

            requestAnimationFrame(this.draw.bind(this));
        };

        ToolLayer.prototype.moveSelectToToolLayer = function () {
            this.addShapes(this.selectList.selectedShapes);
            this.page.requestDraw(this._layer);
        };

        ToolLayer.prototype.moveSelectToLayer = function () {
            this._layer.addShapes(this.selectList.selectedShapes);
            this.page.requestDraw(this._layer);
        };

        ToolLayer.prototype.createCanvas = function (parentElem, width, height) {
            _super.prototype.createCanvas.call(this, parentElem, width, height);
            this.canvas.style.zIndex = "1000"; // tool layer always on top
        };
        return ToolLayer;
    })(LayoutEditor.Layer);
    LayoutEditor.ToolLayer = ToolLayer;
})(LayoutEditor || (LayoutEditor = {}));
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    

    var CommandList = (function () {
        function CommandList() {
            this.commands = [];
            this.currentIndex = 0;
            // globals
            this.layer = null;
            this.propertyPanel = null;
            this.style = null;
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

    var ShapeCommand = (function () {
        function ShapeCommand(page, layer) {
            this.page = page;
            this.layer = layer;
            this.shape = null;
        }
        ShapeCommand.prototype.redo = function () {
            this.layer.addShape(this.shape);
            this.page.requestDraw(this.layer);
            // this.commandList.selectList.setSelectedShapes([this.shape]);
            // this.commandList.propertyPanel.setObjects([this.shape], this.onPropertyChanged.bind(this));
        };

        ShapeCommand.prototype.undo = function () {
            this.layer.removeShape(this.shape);
            this.page.requestDraw(this.layer);
            // what do we set the property panel to display?
        };
        return ShapeCommand;
    })();
    LayoutEditor.ShapeCommand = ShapeCommand;

    var RectCommand = (function (_super) {
        __extends(RectCommand, _super);
        function RectCommand(page, layer, cx, cy, w, h, style) {
            _super.call(this, page, layer);

            this.shape = new LayoutEditor.RectShape("", w, h);
            this.shape.transform.tx = cx;
            this.shape.transform.ty = cy;
            this.shape.style = style;
            this.shape.calculateBounds();
        }
        return RectCommand;
    })(ShapeCommand);
    LayoutEditor.RectCommand = RectCommand;

    var EllipseCommand = (function (_super) {
        __extends(EllipseCommand, _super);
        function EllipseCommand(page, layer, cx, cy, rx, ry, style) {
            _super.call(this, page, layer);

            this.shape = new LayoutEditor.EllipseShape("", rx, ry);
            this.shape.transform.tx = cx;
            this.shape.transform.ty = cy;
            this.shape.style = style;
            this.shape.calculateBounds();
        }
        return EllipseCommand;
    })(ShapeCommand);
    LayoutEditor.EllipseCommand = EllipseCommand;

    // handles MoveCommand, RotateCommand, ResizeCommand
    var TransformCommand = (function () {
        function TransformCommand(page, layer, shapes, oldTransforms) {
            this.page = page;
            this.layer = layer;
            this.layers = null;
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
                this.shapes[i].refresh();
            }
            this.page.requestDraw(this.layer);
        };

        TransformCommand.prototype.undo = function () {
            for (var i = 0; i < this.shapes.length; ++i) {
                this.shapes[i].transform.copy(this.oldTransforms[i]);
                this.shapes[i].refresh();
            }
            this.page.requestDraw(this.layer);
        };
        return TransformCommand;
    })();
    LayoutEditor.TransformCommand = TransformCommand;

    var TextCommand = (function () {
        function TextCommand(page, layer, shape, text) {
            this.page = page;
            this.layer = layer;
            this.shape = shape;
            this.text = text;
            this.oldText = this.shape.text;
        }
        TextCommand.prototype.redo = function () {
            this.shape.text = this.text;
            this.shape.refresh();
            this.page.requestDraw(this.layer);
        };

        TextCommand.prototype.undo = function () {
            this.shape.text = this.oldText;
            this.shape.refresh();
            this.page.requestDraw(this.layer);
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
        function DuplicateSelectedCommand(page, layer, selectList) {
            this.page = page;
            this.layer = layer;
            this.selectList = selectList;
            this.oldSelected = this.selectList.getSelectedShapes().slice(); // copy
        }
        DuplicateSelectedCommand.prototype.redo = function () {
            if (!this.duplicatedShapes) {
                this.duplicatedShapes = this.selectList.duplicateSelected();
            } else {
                // re-add the shapes from the previous undo - don't re-duplicate them
                this.selectList.layer.addShapes(this.duplicatedShapes);
            }
            this.selectList.setSelectedShapes(this.duplicatedShapes);
            this.page.requestDraw(this.layer);
        };

        DuplicateSelectedCommand.prototype.undo = function () {
            this.selectList.deleteSelected();
            this.selectList.setSelectedShapes(this.oldSelected);
            this.page.requestDraw(this.layer);
        };
        return DuplicateSelectedCommand;
    })();
    LayoutEditor.DuplicateSelectedCommand = DuplicateSelectedCommand;

    var DeleteSelectedCommand = (function () {
        function DeleteSelectedCommand(page, layer, selectList) {
            this.page = page;
            this.layer = layer;
            this.selectList = selectList;
            this.oldSelected = this.selectList.getSelectedShapes().slice();
            this.oldLayer = this.selectList.layer;
        }
        DeleteSelectedCommand.prototype.redo = function () {
            this.selectList.deleteSelected();
            this.page.requestDraw(this.layer);
        };

        DeleteSelectedCommand.prototype.undo = function () {
            this.oldLayer.addShapes(this.oldSelected);
            this.selectList.setSelectedShapes(this.oldSelected);
            this.page.requestDraw(this.layer);
        };
        return DeleteSelectedCommand;
    })();
    LayoutEditor.DeleteSelectedCommand = DeleteSelectedCommand;

    LayoutEditor.g_drawCtx = null;
    LayoutEditor.g_Layer = null;
})(LayoutEditor || (LayoutEditor = {}));
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    //------------------------------
    var Tool = (function () {
        function Tool(toolLayer) {
            this.toolLayer = toolLayer;
            this.isUsing = false;
        }
        Tool.prototype.onPointer = function (e) {
            return false;
        };
        Tool.prototype.draw = function (ctx) {
        };

        Tool.prototype.refresh = function () {
        };
        return Tool;
    })();
    LayoutEditor.Tool = Tool;

    var DrawTool = (function (_super) {
        __extends(DrawTool, _super);
        function DrawTool(toolLayer) {
            _super.call(this, toolLayer);
            this.shape = null;
            this.canUse = false;
        }
        DrawTool.prototype.draw = function (ctx) {
            if (this.shape && this.isUsing) {
                this.shape.draw(ctx, this.toolLayer.page.panZoom);
            }
        };

        DrawTool.prototype.onPointer = function (e) {
            return false;
        };
        return DrawTool;
    })(Tool);
    LayoutEditor.DrawTool = DrawTool;

    var RectTool = (function (_super) {
        __extends(RectTool, _super);
        function RectTool(toolLayer) {
            _super.call(this, toolLayer);
            this.rectShape = new LayoutEditor.RectShape("_RectTool", 0, 0);
            this.x1 = -1;
            this.y1 = -1;
            this.x2 = -1;
            this.y2 = -1;
            this.shape = this.rectShape;
            this.rectShape.style = this.toolLayer.style;
        }
        RectTool.prototype.onPointer = function (e) {
            var isHandled = false;
            var grid = this.toolLayer.grid;

            switch (e.state) {
                case 1 /* Start */:
                    grid.rebuildTabs([this.toolLayer.layer]);
                    var pos = grid.snapXY(e.x, e.y);
                    this.x1 = this.x2 = pos.x;
                    this.y1 = this.y2 = pos.y;
                    this.isUsing = true;
                    break;

                case 2 /* Move */:
                    var pos = grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
                    this.canUse = true;
                    break;

                case 3 /* End */:
                    if (this.canUse) {
                        var toolLayer = this.toolLayer;
                        var newCommand = new LayoutEditor.RectCommand(toolLayer.page, toolLayer.layer, this.rectShape.transform.tx, this.rectShape.transform.ty, this.rectShape.w, this.rectShape.h, toolLayer.style);
                        toolLayer.commandList.addCommand(newCommand);
                        this.canUse = false;
                    }

                    this.isUsing = false;
                    isHandled = true;
                    break;
            }
            return isHandled || this.isUsing;
        };

        RectTool.prototype.draw = function (ctx) {
            if (!this.isUsing)
                return;

            this.rectShape.fromRect(Math.min(this.x1, this.x2), Math.min(this.y1, this.y2), Math.abs(this.x2 - this.x1), Math.abs(this.y2 - this.y1));

            _super.prototype.draw.call(this, ctx);
        };
        return RectTool;
    })(DrawTool);
    LayoutEditor.RectTool = RectTool;

    var EllipseTool = (function (_super) {
        __extends(EllipseTool, _super);
        function EllipseTool(toolLayer) {
            _super.call(this, toolLayer);
            this.ellipseShape = new LayoutEditor.EllipseShape("_EllipseTool", 0, 0);
            this.shape = this.ellipseShape;
            this.ellipseShape.style = this.toolLayer.style;
        }
        EllipseTool.prototype.onPointer = function (e) {
            var isHandled = false;
            var grid = this.toolLayer.grid;

            switch (e.state) {
                case 1 /* Start */:
                    grid.rebuildTabs([this.toolLayer.layer]);
                    var pos = grid.snapXY(e.x, e.y);
                    this.x1 = this.x2 = pos.x;
                    this.y1 = this.y2 = pos.y;
                    this.isUsing = true;
                    break;

                case 2 /* Move */:
                    var pos = grid.snapXY(e.x, e.y);
                    this.x2 = pos.x;
                    this.y2 = pos.y;
                    this.canUse = true;
                    break;

                case 3 /* End */:
                    if (this.isUsing) {
                        if (this.canUse) {
                            var toolLayer = this.toolLayer;
                            var newCommand = new LayoutEditor.EllipseCommand(toolLayer.page, toolLayer.layer, this.ellipseShape.transform.tx, this.ellipseShape.transform.ty, this.ellipseShape.rx, this.ellipseShape.ry, toolLayer.style);
                            toolLayer.commandList.addCommand(newCommand);
                            this.canUse = false;
                        }
                        this.isUsing = false;
                        isHandled = true;
                    }
                    break;
            }

            return isHandled || this.isUsing;
        };

        EllipseTool.prototype.draw = function (ctx) {
            if (!this.isUsing)
                return;

            this.ellipseShape.fromRect(Math.min(this.x1, this.x2), Math.min(this.y1, this.y2), Math.abs(this.x2 - this.x1), Math.abs(this.y2 - this.y1));

            _super.prototype.draw.call(this, ctx);
        };
        return EllipseTool;
    })(DrawTool);
    LayoutEditor.EllipseTool = EllipseTool;

    var SelectTool = (function (_super) {
        __extends(SelectTool, _super);
        function SelectTool(toolLayer) {
            _super.call(this, toolLayer);
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
                    this.aabbShape.refresh();
                    this.isUsing = true;
                    break;

                case 2 /* Move */:
                    if (this.isUsing) {
                        this.aabbShape.x2 = e.x;
                        this.aabbShape.y2 = e.y;
                        this.aabbShape.refresh();
                    }
                    break;

                case 3 /* End */:
                    if (this.isUsing) {
                        var shapes = this.toolLayer.layer.getShapesInBounds(this.aabbShape.aabb);
                        this.toolLayer.selectList.setSelectedShapes(shapes);

                        this.isUsing = false;

                        isHandled = true;
                    }
                    break;
            }

            return this.isUsing || isHandled;
        };

        SelectTool.prototype.draw = function (ctx) {
            if (!this.isUsing)
                return;

            this.aabbShape.draw(ctx, this.toolLayer.page.panZoom);

            LayoutEditor.g_selectStyle.drawShape(ctx);
            var shapes = this.toolLayer.layer.getShapesInBounds(this.aabbShape.aabb);
            for (var i = 0; i < shapes.length; ++i) {
                shapes[i].drawSelect(ctx, this.toolLayer.page.panZoom);
            }
        };
        return SelectTool;
    })(Tool);
    LayoutEditor.SelectTool = SelectTool;

    var ResizeTool = (function (_super) {
        __extends(ResizeTool, _super);
        function ResizeTool(toolLayer) {
            _super.call(this, toolLayer);
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
                    var shape = this.toolLayer.layer.getShapeInXY(e.x, e.y);
                    this.handle = 0 /* None */;

                    if (shape) {
                        if (!this.toolLayer.selectList.isSelected(shape)) {
                            this.toolLayer.selectList.setSelectedShapes([shape]);
                        }
                    }

                    var selectGroup = this.toolLayer.selectList.selectGroup;
                    if (selectGroup.isInsideOABBXY(e.x, e.y)) {
                        this.toolLayer.moveSelectToToolLayer();
                        this.toolLayer.grid.rebuildTabs([this.toolLayer.layer]);

                        this.oldOABB.copy(selectGroup.oabb);
                        this.oldTransform.copy(selectGroup.transform);

                        var shapes = this.toolLayer.selectList.selectGroup.shapes;
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
                        this.isUsing = true;
                        this.deltaX = 0;
                        this.deltaY = 0;

                        isHandled = true;
                    }
                    break;

                case 2 /* Move */:
                    if (this.isUsing) {
                        var transform = this.toolLayer.selectList.selectGroup.transform;
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

                        this.canUse = this.handle !== 0 /* None */;

                        this.toolLayer.selectList.selectGroup.refresh();
                        isHandled = true;
                    }
                    break;

                case 3 /* End */:
                    if (this.isUsing) {
                        var toolLayer = this.toolLayer;

                        if (this.canUse) {
                            var newCommand = new LayoutEditor.TransformCommand(toolLayer.page, toolLayer.layer, toolLayer.selectList.selectGroup.shapes, this.oldShapeTransforms);
                            toolLayer.commandList.addCommand(newCommand);
                        }
                        toolLayer.moveSelectToLayer();
                        isHandled = true;

                        this.canUse = false;
                        this.isUsing = false;
                        this.oldShapeTransforms.length = 0;
                    }
                    break;
            }

            return isHandled || this.isUsing;
        };

        ResizeTool.prototype.draw = function (ctx) {
            if (!this.isUsing)
                return;

            for (var i = 0; i < this.toolLayer.selectList.selectedShapes.length; ++i) {
                this.toolLayer.selectList.selectedShapes[i].draw(ctx, this.toolLayer.page.panZoom); // draw the shape in the tool context
            }
        };
        return ResizeTool;
    })(Tool);
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

    var RotateTool = (function (_super) {
        __extends(RotateTool, _super);
        function RotateTool(toolLayer) {
            _super.call(this, toolLayer);
            this.lastAngle = 0;
            this.pivotX = 0;
            this.pivotY = 0;
            this.oldTransform = new LayoutEditor.Transform();
            this.oldShapeTransforms = [];
        }
        RotateTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 1 /* Start */:
                    var shape = this.toolLayer.layer.getShapeInXY(e.x, e.y);
                    if (shape) {
                        if (!this.toolLayer.selectList.isSelected(shape)) {
                            this.toolLayer.selectList.setSelectedShapes([shape]);
                        }
                    }

                    var selectGroup = this.toolLayer.selectList.selectGroup;
                    if (selectGroup.isInsideOABBXY(e.x, e.y)) {
                        this.toolLayer.moveSelectToToolLayer();

                        this.oldTransform.copy(selectGroup.transform);

                        var shapes = this.toolLayer.selectList.selectGroup.shapes;
                        for (var i = 0; i < shapes.length; ++i) {
                            this.oldShapeTransforms[i] = shapes[i].transform.clone();
                        }

                        this.pivotX = selectGroup.transform.tx;
                        this.pivotY = selectGroup.transform.tx;
                        this.lastAngle = this.getAngle(e.x, e.y, this.pivotX, this.pivotY);
                        this.isUsing = true;

                        isHandled = true;
                    }
                    break;

                case 2 /* Move */:
                    if (this.isUsing) {
                        var newAngle = this.getAngle(e.x, e.y, this.pivotX, this.pivotY);
                        this.toolLayer.selectList.selectGroup.transform.rotate(newAngle - this.lastAngle);
                        this.toolLayer.selectList.selectGroup.refresh();

                        isHandled = true;
                        this.lastAngle = newAngle;
                    }
                    break;

                case 3 /* End */:
                    if (this.isUsing) {
                        var toolLayer = this.toolLayer;
                        var newCommand = new LayoutEditor.TransformCommand(toolLayer.page, toolLayer.layer, toolLayer.selectList.selectGroup.shapes, this.oldShapeTransforms);
                        toolLayer.commandList.addCommand(newCommand);
                        toolLayer.moveSelectToLayer();
                        isHandled = true;
                        this.isUsing = false;
                    }

                    break;
            }

            return isHandled || this.isUsing;
        };

        RotateTool.prototype.draw = function (ctx) {
            if (!this.isUsing)
                return;

            for (var i = 0; i < this.toolLayer.selectList.selectedShapes.length; ++i) {
                this.toolLayer.selectList.selectedShapes[i].draw(ctx, this.toolLayer.page.panZoom); // draw the shape in the tool context
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
    })(Tool);
    LayoutEditor.RotateTool = RotateTool;

    var MoveTool = (function (_super) {
        __extends(MoveTool, _super);
        function MoveTool(toolLayer) {
            _super.call(this, toolLayer);
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
                    this.shape = this.toolLayer.layer.getShapeInXY(e.x, e.y);

                    if (this.shape) {
                        if (!this.toolLayer.selectList.isSelected(this.shape)) {
                            this.toolLayer.selectList.setSelectedShapes([this.shape]);
                        }

                        var shapes = this.toolLayer.selectList.selectGroup.shapes;
                        for (var i = 0; i < shapes.length; ++i) {
                            this.oldShapeTransforms[i] = shapes[i].transform.clone();
                        }

                        this.toolLayer.moveSelectToToolLayer(); // hide before rebuilding tabs, so we don't include them
                        this.toolLayer.grid.rebuildTabs([this.toolLayer.layer]);
                        this.oldTransform.copy(this.toolLayer.selectList.selectGroup.transform);
                        this.oldAABB.copy(this.toolLayer.selectList.selectGroup.aabb);
                        this.deltaX = 0;
                        this.deltaY = 0;
                        this.isUsing = true;

                        isHandled = true;
                    }
                    break;

                case 2 /* Move */:
                    if (this.shape) {
                        this.deltaX += e.deltaX;
                        this.deltaY += e.deltaY;

                        var delta = this.snapAABBToGrid(this.deltaX, this.deltaY);

                        var moveTransform = this.toolLayer.selectList.selectGroup.transform;

                        moveTransform.tx = this.oldTransform.tx + delta.x;
                        moveTransform.ty = this.oldTransform.ty + delta.y;

                        this.toolLayer.selectList.selectGroup.refresh();

                        this.canUse = true;

                        isHandled = true;
                    }
                    break;

                case 3 /* End */:
                    if (this.isUsing) {
                        var toolLayer = this.toolLayer;
                        if (this.canUse) {
                            var newCommand = new LayoutEditor.TransformCommand(toolLayer.page, toolLayer.layer, toolLayer.selectList.selectGroup.shapes, this.oldShapeTransforms);
                            toolLayer.commandList.addCommand(newCommand);
                        }
                        toolLayer.moveSelectToLayer();
                        toolLayer.grid.clearSnap();

                        this.canUse = false;
                        this.shape = null;
                        this.isUsing = false;

                        isHandled = true;
                    }
                    break;
            }

            return isHandled || this.shape !== null;
        };

        MoveTool.prototype.draw = function (ctx) {
            if (!this.isUsing)
                return;

            for (var i = 0; i < this.toolLayer.selectList.selectedShapes.length; ++i) {
                this.toolLayer.selectList.selectedShapes[i].draw(ctx, this.toolLayer.page.panZoom); // draw the shape in the tool context
            }
        };

        MoveTool.prototype.snapAABBToGrid = function (dx, dy) {
            // the delta is wrt to the original aabb
            var aabb = this.oldAABB;
            var grid = this.toolLayer.grid;

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

            var newLeft = grid.snapX(left);
            if (left !== newLeft) {
                delta.x += newLeft - left;
            } else {
                var newRight = grid.snapX(right);
                if (right !== newRight) {
                    delta.x += newRight - right;
                } else {
                    var newCenterX = grid.snapX(centerX);
                    if (newCenterX !== centerX) {
                        delta.x += newCenterX - centerX;
                    }
                }
            }

            var newTop = grid.snapY(top);
            if (top !== newTop) {
                delta.y += newTop - top;
            } else {
                var newBottom = grid.snapY(bottom);
                if (bottom !== newBottom) {
                    delta.y += newBottom - bottom;
                } else {
                    var newCenterY = grid.snapY(centerY);
                    if (newCenterY !== centerY) {
                        delta.y += newCenterY - centerY;
                    }
                }
            }

            return delta;
        };
        return MoveTool;
    })(Tool);
    LayoutEditor.MoveTool = MoveTool;

    var PanZoomTool = (function (_super) {
        __extends(PanZoomTool, _super);
        function PanZoomTool(toolLayer) {
            _super.call(this, toolLayer);
        }
        PanZoomTool.prototype.onPointer = function (e) {
            var isHandled = false;
            var panZoom = this.toolLayer.page.panZoom;

            switch (e.state) {
                case 1 /* Start */:
                    this.isUsing = true;
                    break;

                case 2 /* Move */:
                    panZoom.panX += panZoom.deltaX;
                    panZoom.panY += panZoom.deltaY;

                    isHandled = true;
                    break;

                case 6 /* MouseWheel */:
                    var scale = (panZoom.deltaY > 0 ? 1 / 1.15 : 1.15);
                    panZoom.panX += e.x * panZoom.zoom * (1 - scale);
                    panZoom.panY += e.y * panZoom.zoom * (1 - scale);
                    panZoom.zoom *= scale;

                    isHandled = true;
                    break;

                case 3 /* End */:
                    this.isUsing = false;
                    break;
            }

            if (this.isUsing || isHandled) {
                this.toolLayer.page.requestDraw();
            }

            return this.isUsing || isHandled;
        };

        PanZoomTool.prototype.draw = function (ctx) {
        };
        return PanZoomTool;
    })(Tool);
    LayoutEditor.PanZoomTool = PanZoomTool;

    var TextTool = (function (_super) {
        __extends(TextTool, _super);
        function TextTool(toolLayer) {
            _super.call(this, toolLayer);
            this.shape = null;
            this.editShape = null;
            this.inputListener = null;

            LayoutEditor.g_inputMultiLine.addEventListener('input', this.onInput.bind(this));
        }
        TextTool.prototype.onPointer = function (e) {
            var isHandled = false;

            switch (e.state) {
                case 4 /* DoubleClick */:
                    var toolLayer = this.toolLayer;
                    this.shape = toolLayer.layer.getShapeInXY(e.x, e.y);
                    if (this.shape) {
                        this.editShape = this.shape.clone();

                        var left = this.shape.oabb.cx + toolLayer.canvas.offsetLeft + "px";
                        var top = this.shape.oabb.cy + toolLayer.canvas.offsetTop + "px";
                        LayoutEditor.g_inputMultiLine.style.left = left;
                        LayoutEditor.g_inputMultiLine.style.top = top;
                        LayoutEditor.g_inputMultiLine.value = this.editShape.text;
                        LayoutEditor.g_inputMultiLine.style.display = "block";
                        LayoutEditor.g_inputMultiLine.focus();
                        isHandled = true;

                        this.isUsing = true;
                    }
                    break;

                case 1 /* Start */:
                    if (this.shape && this.toolLayer.layer.getShapeInXY(e.x, e.y) !== this.shape) {
                        this.stopTool();
                        this.isUsing = false;
                        // don't mark this as handled to permit another tool to use this
                        // Start event e.g. we stop writing text because we are making a selection lasso
                        // isHandled = true;
                    }
            }

            return isHandled || this.isUsing;
        };

        TextTool.prototype.stopTool = function () {
            if (this.shape) {
                var toolLayer = this.toolLayer;
                var newCommand = new LayoutEditor.TextCommand(toolLayer.page, toolLayer.layer, this.shape, this.editShape.text);
                toolLayer.commandList.addCommand(newCommand);

                this.shape = null;
                this.isUsing = false;

                LayoutEditor.g_inputMultiLine.value = "";
                LayoutEditor.g_inputMultiLine.style.display = "none";
            }
        };

        TextTool.prototype.onInput = function (e) {
            if (this.shape === null)
                return;

            this.editShape.text = LayoutEditor.g_inputMultiLine.value;
            this.toolLayer.draw();
            this.draw(this.toolLayer.ctx);
        };

        TextTool.prototype.draw = function (ctx) {
            if (!this.isUsing)
                return;

            this.editShape.draw(ctx, this.toolLayer.page.panZoom);
        };
        return TextTool;
    })(Tool);
    LayoutEditor.TextTool = TextTool;

    LayoutEditor.g_inputMultiLine = null;
})(LayoutEditor || (LayoutEditor = {}));
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    //------------------------------
    var Editor = (function () {
        function Editor(parentElem, width, height) {
            this.parentElem = parentElem;
            this.width = width;
            this.height = height;
            this.hasRequestToolDraw = false;
            this.toolLayer = new LayoutEditor.ToolLayer();
            this.tool = null;
            this.toolGroup = [];
            this.page = new LayoutEditor.Page();
            this.reset();
        }
        Object.defineProperty(Editor.prototype, "selectChanged", {
            get: function () {
                return this.toolLayer.selectList.selectChanged;
            },
            enumerable: true,
            configurable: true
        });

        Editor.prototype.reset = function () {
            while (this.parentElem.lastChild)
                this.parentElem.removeChild(this.parentElem.lastChild);

            this.page.reset();
            this.page.setRootElem(this.parentElem, this.width, this.height);

            var layer = new LayoutEditor.Layer();
            this.page.addLayer(layer);

            this.toolLayer.destroyCanvas(this.parentElem);
            this.toolLayer.reset();
            this.toolLayer.page = this.page;
            this.toolLayer.layer = layer;
            this.toolLayer.createCanvas(this.parentElem, this.width, this.height);

            this.toolGroup.length = 0;
            this.tool = null;

            this.requestToolDraw();
        };

        Editor.prototype.refresh = function () {
        };

        Editor.prototype.setTool = function (toolName) {
            var toolLayer = this.toolLayer;
            switch (toolName) {
                case "selectTool":
                    this.toolGroup = [new LayoutEditor.TextTool(toolLayer), new LayoutEditor.ResizeTool(toolLayer), new LayoutEditor.SelectTool(toolLayer)];
                    break;

                case "resizeTool":
                    this.toolGroup = [new LayoutEditor.TextTool(toolLayer), new LayoutEditor.ResizeTool(toolLayer), new LayoutEditor.SelectTool(toolLayer)];
                    break;

                case "moveTool":
                    this.toolGroup = [new LayoutEditor.TextTool(toolLayer), new LayoutEditor.MoveTool(toolLayer), new LayoutEditor.SelectTool(toolLayer)];
                    break;

                case "rectTool":
                    this.toolGroup = [new LayoutEditor.RectTool(toolLayer)];
                    break;

                case "ellipseTool":
                    this.toolGroup = [new LayoutEditor.EllipseTool(toolLayer)];
                    break;

                case "rotateTool":
                    this.toolGroup = [new LayoutEditor.TextTool(toolLayer), new LayoutEditor.RotateTool(toolLayer), new LayoutEditor.SelectTool(toolLayer)];
                    break;

                case "panZoomTool":
                    this.toolGroup = [new LayoutEditor.TextTool(toolLayer), new LayoutEditor.ResizeTool(toolLayer), new LayoutEditor.PanZoomTool(toolLayer)];
                    break;

                case "textTool":
                    this.toolGroup = [new LayoutEditor.TextTool(toolLayer), new LayoutEditor.ResizeTool(toolLayer), new LayoutEditor.SelectTool(toolLayer)];
                    break;
            }
        };

        Editor.prototype.onPointer = function (e) {
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

            for (var i = 0; tool === null && i < this.toolGroup.length; ++i) {
                if (this.toolGroup[i].onPointer(e)) {
                    tool = this.toolGroup[i];
                    this.requestToolDraw();
                }
            }

            this.tool = tool;
        };

        Editor.prototype.draw = function () {
            this.page.draw();
        };

        Editor.prototype.requestToolDraw = function () {
            if (this.hasRequestToolDraw)
                return;
            this.hasRequestToolDraw = true;

            var self = this;
            requestAnimationFrame(function () {
                self.toolLayer.draw();
                if (self.tool !== null)
                    self.tool.draw(self.toolLayer.ctx);

                self.hasRequestToolDraw = false;
            });
        };

        Editor.prototype.undo = function () {
            this.toolLayer.undo();
        };

        Editor.prototype.redo = function () {
            this.toolLayer.redo();
        };

        Editor.prototype.saveData = function () {
            var obj = {
                type: "editor",
                page: this.page.saveData()
            };
            return obj;
        };

        Editor.prototype.loadData = function (obj) {
            Helper.assert(obj.type === "editor");
            this.reset();

            this.page.loadData(obj.page);
        };
        return Editor;
    })();
    LayoutEditor.Editor = Editor;
})(LayoutEditor || (LayoutEditor = {}));
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    "use strict";

    var StylePanel = (function () {
        function StylePanel(styleList) {
            this.styleList = styleList;
            this.canvas = null;
            this.ctx = null;
            this.rootElem = null;
            this.addButton = null;
            this.selected = null;
            this.elems = {};
            this.selectChanged = new Helper.Callback();
        }
        StylePanel.prototype.setRootElem = function (elem) {
            this.rootElem = elem;

            var self = this;
            elem.addEventListener("click", function (e) {
                self.onClick(e);
            });

            this.reset();
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

            if (this.styleList.styles.length > 0)
                this.selectStyle(this.styleList.styles[0].name);
        };

        StylePanel.prototype.draw = function () {
            this.selected.refresh();
        };

        StylePanel.prototype.selectStyle = function (styleName) {
            if (this.selected)
                this.selected.classList.remove('selectedStyle');

            this.selected = this.elems[styleName];
            if (this.selected) {
                this.selected.classList.add('selectedStyle');
                this.selectChanged.fire(styleName);
            }
        };

        StylePanel.prototype.buildHTML = function () {
            this.selected = null;

            while (this.rootElem.lastChild)
                this.rootElem.removeChild(this.rootElem.lastChild);

            this.addButton = document.createElement('div');
            this.addButton.classList.add('StylePanelAddButton');
            this.addButton.addEventListener("click", this.onAddStyle.bind(this));
            this.addButton.innerHTML = "+";
            this.rootElem.appendChild(this.addButton);

            for (var i = 0; i < this.styleList.styles.length; ++i) {
                var newElem = document.createElement('x-styleButton');
                var name = this.styleList.styles[i].name;

                newElem.setAttribute('value', name);

                this.rootElem.appendChild(newElem);
                this.elems[name] = newElem;
            }
        };

        StylePanel.prototype.onAddStyle = function () {
            var newStyle = new LayoutEditor.Style();
            this.styleList.addStyle(newStyle);
            this.buildHTML();
            this.selectStyle(newStyle.name);
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
            this.rectShape = new LayoutEditor.RectShape("_Thumb", this.width - 20, this.height - 20);
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
                this.rectShape.style = style;

            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.rectShape.draw(ctx, LayoutEditor.PanZoom.none);

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
})(LayoutEditor || (LayoutEditor = {}));
// Copyright 2014 Reece Elliott
/// <reference path="interactionhelper.ts" />
/// <reference path="helper.ts" />
/// <reference path="system.ts" />
/// <reference path="propertypanel.ts" />
/// <reference path="style.ts" />
/// <reference path="panzoom.ts" />
/// <reference path="screen.ts" />
/// <reference path="shape.ts" />
/// <reference path="layer.ts" />
/// <reference path="page.ts" />
/// <reference path="select.ts" />
/// <reference path="grid.ts" />
/// <reference path="toollayer.ts" />
/// <reference path="command.ts" />
/// <reference path="tool.ts" />
/// <reference path="editor.ts" />
/// <reference path="stylepanel.ts" />
// Copyright 2014 Reece Elliott
/// <reference path="_dependencies.ts" />
var LayoutEditor;
(function (LayoutEditor) {
    "use strict";

    var g_propertyTool = null;
    var g_stylePanel = new LayoutEditor.StylePanel(LayoutEditor.g_styleList);
    var g_editor = null;

    //------------------------------
    function toolButtonClick(e) {
        g_editor.setTool(e.target.id);
    }

    function saveData() {
        var obj = {
            styleList: LayoutEditor.g_styleList.saveData(),
            editor: g_editor.saveData()
        };
        var objString = JSON.stringify(obj);
        localStorage['layouteditor'] = objString;

        var downloadElem = document.getElementById("download");
        downloadElem.setAttribute("href", "data:text/plain," + encodeURIComponent(objString));
    }

    function loadData() {
        var obj = JSON.parse(localStorage['layouteditor']);
        reset();
        LayoutEditor.g_styleList.loadData(obj.styleList);
        g_editor.loadData(obj.editor);
    }

    function reset() {
        g_editor.reset();
        LayoutEditor.g_propertyPanel.reset();

        g_editor.setTool("rectTool");
        shapesSelect();
        // g_commandList.reset();
        // g_shapeList.reset();
        // g_panZoom.reset();
        // g_styleList.reset();
        // g_selectList.reset();
        // stylePanel.reset();
        // // provide a slide border so we can see the screen box
        // g_panZoom.panX = -10;
        // g_panZoom.panY = -10;
        // g_draw(g_shapeList);
        // g_draw(g_screen);
        // g_draw(g_panZoom);
        // g_draw(g_selectList);
        // g_draw(stylePanel);
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
        // ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    function renderFrame() {
        // if (drawList.indexOf(g_screen) !== -1 || drawList.indexOf(g_shapeList) !== -1 || drawList.indexOf(g_panZoom) !== -1) {
        //     clear(g_drawCtx);
        //     g_screen.draw(g_drawCtx);
        //     g_shapeList.draw(g_drawCtx);
        // }
        // clear(g_toolCtx);
        // g_selectList.draw(g_toolCtx);
        // for (var i: number = 0; i < drawList.length; ++i) {
        //     var tool = drawList[i];
        //     if (tool instanceof Tool) {
        //         tool.draw(g_toolCtx);
        //     }
        // }
        // if (drawList.indexOf(stylePanel)) {
        //     stylePanel.refresh();
        // }
        // drawList.length = 0;
        // requestFrame = false;
    }

    function duplicateSelect() {
        // g_editor.commandList.addCommand(new DuplicateSelectedCommand(g_editor.selectList));
    }

    function deleteSelect() {
        // g_editor.commandList.addCommand(new DeleteSelectedCommand(g_editor.selectList));
    }

    function changePlatform(e) {
        g_editor.toolLayer.screen.setPlatform(parseInt(e.target.value));
    }

    function shapesSelect() {
        document.getElementById('editor').classList.remove('hidden');
        document.getElementById('layoutStyles').classList.add('hidden');
    }

    function stylesSelect() {
        document.getElementById('editor').classList.add('hidden');
        document.getElementById('layoutStyles').classList.remove('hidden');
    }

    window.addEventListener("load", function () {
        // var canvas = < HTMLCanvasElement > document.getElementById("layoutShapes");
        // var toolCanvas = < HTMLCanvasElement > document.getElementById("layoutTool");
        // var interactionCanvas = < HTMLCanvasElement > document.getElementById("interaction");
        var editorElem = document.getElementById("editor");

        // g_drawCtx = canvas.getContext("2d");
        // g_toolCtx = toolCanvas.getContext("2d");
        // g_draw = draw;
        var toolElems = document.querySelectorAll(".tool");
        for (var i = 0; i < toolElems.length; ++i) {
            toolElems[i].addEventListener("click", toolButtonClick);
        }

        document.getElementById("undo").addEventListener("click", function () {
            g_editor.undo();
        });
        document.getElementById("redo").addEventListener("click", function () {
            g_editor.redo();
        });
        document.getElementById("clear").addEventListener("click", reset);
        document.getElementById("load").addEventListener("click", loadData);
        document.getElementById("save").addEventListener("click", saveData);
        document.getElementById("duplicate").addEventListener("click", duplicateSelect);
        document.getElementById("delete").addEventListener("click", deleteSelect);
        document.getElementById("shapes").addEventListener("click", shapesSelect);
        document.getElementById("styles").addEventListener("click", stylesSelect);

        LayoutEditor.g_inputText = document.getElementById("inputText");
        LayoutEditor.g_inputMultiLine = document.getElementById("inputMultiLine");

        // g_propertyTool = new PropertyTool();
        LayoutEditor.g_propertyPanel.setRootElem(document.getElementById("PropertyPanel"));
        LayoutEditor.g_textPropertyEditor.setInputElem(LayoutEditor.g_inputText);

        g_stylePanel.setRootElem(document.getElementById("layoutStyles"));
        g_stylePanel.selectChanged.add(function (styleName) {
            LayoutEditor.g_propertyPanel.setObjects([LayoutEditor.g_styleList.getStyle(styleName)], function () {
                g_stylePanel.draw();
                g_editor.draw();
            });
        });

        g_editor = new LayoutEditor.Editor(editorElem, 500, 500);
        g_editor.selectChanged.add(function (objects) {
            LayoutEditor.g_propertyPanel.setObjects(objects, function () {
                g_editor.draw();
            });
        });

        var platformSelect = document.getElementById("platform");
        platformSelect.addEventListener("change", changePlatform);
        platformSelect.value = g_editor.toolLayer.screen.getPlatform().toString();

        reset();

        var watchCanvas = new InteractionHelper.Watch(editorElem, g_editor.onPointer.bind(g_editor));
    });
})(LayoutEditor || (LayoutEditor = {}));
