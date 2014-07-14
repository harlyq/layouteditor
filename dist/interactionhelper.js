// Copyright 2014 Reece Elliott
var InteractionHelper;
(function (InteractionHelper) {
    "use strict";

    var Options = (function () {
        function Options() {
            this.DoubleTapTimeMS = 800;
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
        State[State["DoubleTap"] = 4] = "DoubleTap";
        State[State["Held"] = 5] = "Held";
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

            var doubleTap = false;
            var timeMS = Date.now();

            if (timeMS - this.tapTimeMS < this.options.DoubleTapTimeMS) {
                if (Math.abs(this.tapPosition.x - x) < this.options.MouseCancelTapDistance && Math.abs(this.tapPosition.y - y) < this.options.MouseCancelTapDistance) {
                    doubleTap = true;
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

            if (doubleTap) {
                event.state = 4 /* DoubleTap */;
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
            var doubleTap = false;
            var timeMS = Date.now();

            if (timeMS - this.tapTimeMS < this.options.DoubleTapTimeMS) {
                if (Math.abs(this.tapPosition.x - pinch.x) < this.options.TouchCancelTapDistance && Math.abs(this.tapPosition.y - pinch.y) < this.options.TouchCancelTapDistance) {
                    doubleTap = true;
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

            if (doubleTap) {
                event.state = 4 /* DoubleTap */;
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
