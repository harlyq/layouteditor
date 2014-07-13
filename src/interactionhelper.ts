// Copyright 2014 Reece Elliott
module InteractionHelper {
    "use strict";

    interface XY {
        x: number;
        y: number;
    }

    interface PinchInfo {
        x: number;
        y: number;
        distance: number;
    }

    export class Options {
        DoubleTapTimeMS: number = 800;
        MouseCancelTapDistance: number = 10;
        TouchCancelTapDistance: number = 30;
        HoldTimeMS: number = 500;
    }

    export enum State {
        Invalid, Start, Move, End, DoubleTap, Held
    }

    export class Event {
        x: number = 0;
        y: number = 0;
        deltaX: number = 0;
        deltaY: number = 0;
        pinchDistance: number = 0;
        state: State = State.Invalid;
        target = null;
        origin = null;

        constructor() {}
    }

    export class Watch {
        private options: Options = null;
        private tapTimeMS: number = 0;
        private tapPosition: XY = {
            x: -1,
            y: -1
        };
        private heldID = 0;
        private lastX: number = 0;
        private lastY: number = 0;
        private moveStarted: boolean = false;

        private mouseUpHandler = null;
        private mouseMoveHandler = null;
        private touchEndHandler = null;
        private touchMoveHandler = null;

        constructor(public elem, private onPointerFunc: (e: Event) => any, options ? : Options) {
            if (options)
                this.options = options;
            else
                this.options = new Options();

            var self: Watch = this;
            elem.addEventListener("mousedown", function(e) {
                self.mouseDown(e);
            });
            elem.addEventListener("touchstart", function(e) {
                self.touchStart(e);
            });
        }

        private heldTimeout() {
            var event = new Event();
            event.x = this.lastX;
            event.y = this.lastY;
            event.state = State.Held;
            event.target = this.elem;
            event.origin = this.elem;

            this.onPointerFunc(event);
        }

        private startHeldTimer() {
            clearTimeout(this.heldID);
            var self = this;
            this.heldID = setTimeout(function() {
                self.heldTimeout()
            }, this.options.HoldTimeMS);
        }

        private stopHeldTimer() {
            clearTimeout(this.heldID);
            this.heldID = 0;
        }

        private mouseDown(e) {
            e.preventDefault();

            var self: Watch = this;
            this.mouseMoveHandler = function(e) {
                self.mouseMove(e)
            };
            this.mouseUpHandler = function(e) {
                self.mouseUp(e)
            };
            document.addEventListener("mousemove", this.mouseMoveHandler);
            document.addEventListener("mouseup", this.mouseUpHandler);

            var x: number = e.pageX - this.elem.offsetLeft;
            var y: number = e.pageY - this.elem.offsetTop;

            var doubleTap: boolean = false;
            var timeMS: number = Date.now();

            if (timeMS - this.tapTimeMS < this.options.DoubleTapTimeMS) {
                if (Math.abs(this.tapPosition.x - x) < this.options.MouseCancelTapDistance &&
                    Math.abs(this.tapPosition.y - y) < this.options.MouseCancelTapDistance) {
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
            event.state = State.Start;
            event.target = e.target;
            event.origin = this.elem;

            this.onPointerFunc(event);

            if (doubleTap) {
                event.state = State.DoubleTap;
                this.onPointerFunc(event);
            }

            this.lastX = x;
            this.lastY = y;
        }

        private mouseMove(e) {
            e.preventDefault();

            var x: number = e.pageX - this.elem.offsetLeft;
            var y: number = e.pageY - this.elem.offsetTop;

            if (this.moveStarted ||
                Math.abs(x - this.lastX) >= this.options.MouseCancelTapDistance ||
                Math.abs(y - this.lastY) >= this.options.MouseCancelTapDistance) {
                this.stopHeldTimer();
                this.tapTimeMS = 0;
                this.moveStarted = true;

                var event = new Event();
                event.x = x;
                event.y = y;
                event.deltaX = x - this.lastX;
                event.deltaY = y - this.lastY;
                event.state = State.Move;
                event.target = e.target;
                event.origin = this.elem;

                this.onPointerFunc(event);
                this.lastX = x;
                this.lastY = y;
            }
        }

        private mouseUp(e) {
            e.preventDefault();
            document.removeEventListener("mousemove", this.mouseMoveHandler);
            document.removeEventListener("mouseup", this.mouseUpHandler);

            var x: number = e.pageX - this.elem.offsetLeft;
            var y: number = e.pageY - this.elem.offsetTop;

            var event = new Event();
            event.x = x;
            event.y = y;
            event.deltaX = x - this.lastX;
            event.deltaY = y - this.lastY;
            event.state = State.End;
            event.target = e.target;
            event.origin = this.elem;

            this.onPointerFunc(event);
            this.lastX = 0;
            this.lastY = 0;
            this.stopHeldTimer();
        }

        private getPinchInfo(e): PinchInfo {
            var touches = e.touches;
            if (touches.length === 0)
                touches = e.changedTouches;

            var x: number = 0;
            var y: number = 0;
            var distance: number = 0;

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
        }

        private touchStart(e) {
            e.preventDefault();

            var self: Watch = this;
            this.touchMoveHandler = function(e) {
                self.touchMove(e)
            };
            this.touchEndHandler = function(e) {
                self.touchEnd(e)
            };
            document.addEventListener("touchmove", this.touchMoveHandler);
            document.addEventListener("touchend", this.touchEndHandler);

            var pinch: PinchInfo = this.getPinchInfo(e);
            var doubleTap: boolean = false;
            var timeMS: number = Date.now();

            if (timeMS - this.tapTimeMS < this.options.DoubleTapTimeMS) {
                if (Math.abs(this.tapPosition.x - pinch.x) < this.options.TouchCancelTapDistance &&
                    Math.abs(this.tapPosition.y - pinch.y) < this.options.TouchCancelTapDistance) {
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
            event.state = State.Start;
            event.target = e.target;
            event.origin = this.elem;

            this.onPointerFunc(event);

            this.onPointerFunc(event);

            if (doubleTap) {
                event.state = State.DoubleTap;
                this.onPointerFunc(event);
            }

            this.lastX = pinch.x;
            this.lastY = pinch.y;
        }

        private touchMove(e) {
            e.preventDefault();

            var x: number = e.pageX - this.elem.offsetLeft;
            var y: number = e.pageY - this.elem.offsetTop;

            if (this.moveStarted ||
                Math.abs(x - this.lastX) > this.options.TouchCancelTapDistance ||
                Math.abs(y - this.lastY) > this.options.TouchCancelTapDistance) {
                this.moveStarted = true;
                var pinch = this.getPinchInfo(e);

                var event = new Event();
                event.x = pinch.x;
                event.y = pinch.y;
                event.deltaX = x - this.lastX;
                event.deltaY = y - this.lastY;
                event.pinchDistance = pinch.distance;
                event.state = State.Move;
                event.target = e.target;
                event.origin - this.elem;

                this.onPointerFunc(event);
                this.lastX = pinch.x;
                this.lastY = pinch.y;

                this.startHeldTimer();
                this.tapTimeMS = 0;
            }
        }

        private touchEnd(e) {
            e.preventDefault();
            if (e.touches.length === 0) {
                document.removeEventListener("touchmove", this.touchMoveHandler);
                document.removeEventListener("touchup", this.touchEndHandler);
            }

            var x: number = e.pageX - this.elem.offsetLeft;
            var y: number = e.pageY - this.elem.offsetTop;

            var pinch: PinchInfo = this.getPinchInfo(e);

            var event = new Event();
            event.x = pinch.x;
            event.y = pinch.y;
            event.deltaX = x - this.lastX;
            event.deltaY = y - this.lastY;
            event.pinchDistance = pinch.distance;
            event.state = State.End;
            event.target = e.target;
            event.origin - this.elem;

            this.onPointerFunc(event);
            this.lastX = 0;
            this.lastY = 0;
            this.stopHeldTimer();
        }
    }

}
