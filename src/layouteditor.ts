// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {
    "use strict";

    var g_tool: Tool = null;
    var g_propertyTool: Tool = null;

    function setTool(toolName: string) {
        var oldTool = g_tool;
        switch (toolName) {
            case "selectTool":
                g_tool = new SelectTool();
                break;

            case "resizeTool":
                g_tool = new ResizeTool();
                break;

            case "moveTool":
                g_tool = new MoveTool();
                break;

            case "rectTool":
                g_tool = new RectTool();
                break;

            case "ellipseTool":
                g_tool = new EllipseTool();
                break;

            case "rotateTool":
                g_tool = new RotateTool();
                break;

            case "panZoomTool":
                g_tool = new PanZoomTool();
                break;

            case "textTool":
                g_tool = new TextTool();
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
        var obj: any = {
            styleList: g_styleList.saveData(),
            shapeList: g_shapeList.saveData(),
            panZoom: g_panZoom.saveData()
        };
        localStorage['layouteditor'] = JSON.stringify(obj);
    }

    function loadData() {
        var obj: any = JSON.parse(localStorage['layouteditor']);
        reset();
        g_styleList.loadData(obj.styleList);
        g_shapeList.loadData(obj.shapeList);
        g_panZoom.loadData(obj.panZoom);
    }

    function reset() {
        g_commandList.reset();
        g_shapeList.reset();
        g_shapeList.requestDraw(g_drawCtx);
        g_panZoom.reset();
        g_styleList.reset();
    }

    var focus = "";

    function setFocus(name: string) {
        if (focus === name)
            return;

        focus = name;
        g_tool.onChangeFocus(name); // TODO make more general
    }

    interface PanelInfo {
        name: string;
        code: Tool;
    }

    window.addEventListener("load", function() {
        var canvas = < HTMLCanvasElement > document.getElementById("layoutbase");
        var toolCanvas = < HTMLCanvasElement > document.getElementById("layouttool");
        var propertyCanvas = < HTMLCanvasElement > document.getElementById("property");
        var interactionCanvas = < HTMLCanvasElement > document.getElementById("interaction");

        g_drawCtx = canvas.getContext("2d");
        g_toolCtx = toolCanvas.getContext("2d");
        g_propertyCtx = propertyCanvas.getContext("2d");

        var toolElems = document.querySelectorAll(".tool");
        for (var i: number = 0; i < toolElems.length; ++i) {
            toolElems[i].addEventListener("click", toolButtonClick);
        }

        document.getElementById("undo").addEventListener("click", function() {
            g_commandList.undo();
        });
        document.getElementById("redo").addEventListener("click", function() {
            g_commandList.redo();
        });
        document.getElementById("clear").addEventListener("click", reset);
        document.getElementById("save").addEventListener("click", saveData);
        document.getElementById("load").addEventListener("click", loadData);

        g_inputText = document.getElementById("inputText");
        g_inputMultiLine = document.getElementById("inputMultiLine");

        g_propertyTool = new PropertyTool();

        setTool("rectTool");

        var watchCanvas = new InteractionHelper.Watch(interactionCanvas, function(e: InteractionHelper.Event) {
            g_panZoom.x = e.x;
            g_panZoom.y = e.y;
            g_panZoom.deltaX = e.deltaX;
            g_panZoom.deltaY = e.deltaY;
            g_panZoom.pinchDistance = e.pinchDistance;

            e.x = g_panZoom.toX(e.x);
            e.y = g_panZoom.toY(e.y);
            e.deltaX = g_panZoom.toW(e.deltaX);
            e.deltaY = g_panZoom.toH(e.deltaY);
            e.pinchDistance *= g_panZoom.zoom;

            var panels: PanelInfo[] = [{
                name: "Property",
                code: g_propertyTool
            }, {
                name: "Tool",
                code: g_tool
            }];
            for (var i: number = 0; i < panels.length; ++i) {
                var panel: PanelInfo = panels[i];
                if (panel.code.onPointer(e)) {
                    setFocus(panel.name);
                    break;
                }
            }
        });
    });
}
