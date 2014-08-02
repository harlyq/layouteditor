// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {
    "use strict";

    var g_propertyTool: Tool = null;
    var g_stylePanel: StylePanel = new StylePanel(g_styleList);
    var g_editor: Editor = null;

    //------------------------------
    function toolButtonClick(e) {
        g_editor.setTool(e.target.id);
    }

    function saveData() {
        var obj: any = {
            styleList: g_styleList.saveData(),
            editor: g_editor.saveData(),
        };
        var objString: string = JSON.stringify(obj);
        localStorage['layouteditor'] = objString;

        var downloadElem = document.getElementById("download");
        downloadElem.setAttribute("href", "data:text/plain," + encodeURIComponent(objString));
    }

    function loadData() {
        var obj: any = JSON.parse(localStorage['layouteditor']);
        reset();
        g_styleList.loadData(obj.styleList);
        g_editor.loadData(obj.editor);
    }

    function reset() {
        g_editor.reset();
        g_propertyPanel.reset();

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

    var requestFrame: boolean = false;
    var drawList: any[] = [];

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

    interface PanelInfo {
        name: string;
        code: Tool;
    }

    window.addEventListener("load", function() {
        // var canvas = < HTMLCanvasElement > document.getElementById("layoutShapes");
        // var toolCanvas = < HTMLCanvasElement > document.getElementById("layoutTool");
        // var interactionCanvas = < HTMLCanvasElement > document.getElementById("interaction");
        var editorElem = document.getElementById("editor");

        // g_drawCtx = canvas.getContext("2d");
        // g_toolCtx = toolCanvas.getContext("2d");

        // g_draw = draw;

        var toolElems = document.querySelectorAll(".tool");
        for (var i: number = 0; i < toolElems.length; ++i) {
            toolElems[i].addEventListener("click", toolButtonClick);
        }

        document.getElementById("undo").addEventListener("click", function() {
            g_editor.undo();
        });
        document.getElementById("redo").addEventListener("click", function() {
            g_editor.redo();
        });
        document.getElementById("clear").addEventListener("click", reset);
        document.getElementById("load").addEventListener("click", loadData);
        document.getElementById("save").addEventListener("click", saveData);
        document.getElementById("duplicate").addEventListener("click", duplicateSelect);
        document.getElementById("delete").addEventListener("click", deleteSelect);
        document.getElementById("shapes").addEventListener("click", shapesSelect);
        document.getElementById("styles").addEventListener("click", stylesSelect);

        g_inputText = document.getElementById("inputText");
        g_inputMultiLine = document.getElementById("inputMultiLine");

        // g_propertyTool = new PropertyTool();
        g_propertyPanel.setRootElem(document.getElementById("PropertyPanel"));
        g_textPropertyEditor.setInputElem(g_inputText);

        g_stylePanel.setRootElem(document.getElementById("layoutStyles"));
        g_stylePanel.selectChanged.add(function(styleName) {
            g_propertyPanel.setObjects([g_styleList.getStyle(styleName)], function() {
                g_stylePanel.draw();
                g_editor.draw();
            });
        });

        g_editor = new Editor(editorElem, 500, 500);
        g_editor.selectChanged.add(function(objects) {
            g_propertyPanel.setObjects(objects, function() {
                g_editor.draw();
            })
        });

        var platformSelect = < HTMLSelectElement > document.getElementById("platform");
        platformSelect.addEventListener("change", changePlatform);
        platformSelect.value = g_editor.toolLayer.screen.getPlatform().toString();

        reset();

        var watchCanvas = new InteractionHelper.Watch(editorElem, g_editor.onPointer.bind(g_editor));
    });
}
