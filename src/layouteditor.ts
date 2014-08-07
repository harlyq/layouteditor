// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {
    "use strict";

    // var g_styleList: StyleList = new StyleList(); simpler if this is global
    var g_pageList: PageList = new PageList();

    var g_propertyPanel: PropertyPanel = new PropertyPanel();
    var g_stylePanel: StylePanel = new StylePanel();
    var g_editorPanel: EditorPanel = new EditorPanel();

    //------------------------------
    function toolButtonClick(e) {
        g_editorPanel.setTool(e.target.id);
    }

    function saveData() {
        var obj: any = {
            styleList: g_styleList.saveData(),
            pageList: g_pageList.saveData(),
        };
        var objString: string = JSON.stringify(obj);
        localStorage['layouteditor'] = objString;

        var downloadElem = document.getElementById("download");
        downloadElem.setAttribute("href", "data:text/plain," + encodeURIComponent(objString));
    }

    function loadData() {
        var obj: any = JSON.parse(localStorage['layouteditor']);

        shutdown();

        g_styleList.loadData(obj.styleList);
        g_pageList.loadData(obj.pageList);

        startup();
    }

    function loadFile(e) {
        var file = e.target.files[0];
        ( < HTMLInputElement > document.getElementById("loadFile")).value = "";
        if (!file)
            return;

        var reader = new FileReader();
        reader.onload = function(e) {
            var obj: any = JSON.parse(e.target.result);

            shutdown();

            g_styleList.loadData(obj.styleList);
            g_pageList.loadData(obj.pageList);

            startup();
        }
        reader.readAsText(file);
    }

    function clear() {
        shutdown();

        g_styleList.newGame();
        g_pageList.newGame();

        startup();
    }

    function shutdown() {
        g_editorPanel.shutdown();
        g_stylePanel.shutdown();
        g_propertyPanel.reset();

        g_pageList.shutdown();
        g_styleList.shutdown();
    }

    function startup() {
        g_styleList.startup();
        g_pageList.startup();

        g_stylePanel.startup();
        g_editorPanel.startup();

        g_editorPanel.setTool("rectTool");
        setPage("0");
    }

    function duplicateSelect() {
        g_editorPanel.toolLayer.duplicateSelect();
    }

    function deleteSelect() {
        g_editorPanel.toolLayer.deleteSelect();
    }

    function changePlatform(e) {
        g_editorPanel.toolLayer.screen.setPlatform(parseInt(e.target.value));
    }

    function shapesSelect() {
        document.getElementById('editor').classList.remove('hidden');
        document.getElementById('layoutStyles').classList.add('hidden');
    }

    function stylesSelect() {
        document.getElementById('editor').classList.add('hidden');
        document.getElementById('layoutStyles').classList.remove('hidden');
    }

    function distribute(e) {
        g_editorPanel.toolLayer.distributeSelect(parseInt(e.target.value));
        e.target.value = 0; // reset to None
    }

    function makeSquare() {
        g_editorPanel.toolLayer.makeSquareSelect();
    }

    function newPage(e) {
        setPage(( < HTMLInputElement > e.target).value);
    }

    function setPage(id) {
        if (id === "styles") {
            document.getElementById('editor').classList.add('hidden');
            document.getElementById('layoutStyles').classList.remove('hidden');
        } else {
            document.getElementById('editor').classList.remove('hidden');
            document.getElementById('layoutStyles').classList.add('hidden');
            g_editorPanel.pageNumber = parseInt(id);
        }
    }

    function addImage(e) {
        var file = e.target.files[0];
        ( < HTMLInputElement > document.getElementById("imageTool")).value = "";
        if (!file)
            return;

        var reader = new FileReader();
        reader.onloadend = function(e) {
            g_editorPanel.toolLayer.addImage(reader.result);
        }
        reader.readAsDataURL(file);
    }

    window.addEventListener("load", function() {
        var editorElem = document.getElementById("editor");

        var toolElems = document.querySelectorAll(".tool");
        for (var i: number = 0; i < toolElems.length; ++i) {
            toolElems[i].addEventListener("click", toolButtonClick);
        }

        document.getElementById("undo").addEventListener("click", function() {
            g_editorPanel.undo();
        });
        document.getElementById("redo").addEventListener("click", function() {
            g_editorPanel.redo();
        });
        document.getElementById("clear").addEventListener("click", clear);
        document.getElementById("load").addEventListener("click", loadData);
        document.getElementById("save").addEventListener("click", saveData);
        document.getElementById("duplicate").addEventListener("click", duplicateSelect);
        document.getElementById("delete").addEventListener("click", deleteSelect);
        document.getElementById("loadFile").addEventListener("change", loadFile);
        document.getElementById("makeSquare").addEventListener("click", makeSquare);
        document.getElementById("distribute").addEventListener("change", distribute);
        document.getElementById("page").addEventListener("change", newPage);
        document.getElementById("imageTool").addEventListener("change", addImage);

        g_inputMultiLine = document.getElementById("inputMultiLine");

        g_pageList.setup(editorElem, 500, 500);

        g_propertyPanel.setup(document.getElementById("PropertyPanel"), g_editorList);

        g_stylePanel.setup(document.getElementById("layoutStyles"));
        g_stylePanel.selectChanged.add(function(styles: Style[]) {
            g_propertyPanel.setObjects(styles, function() {
                g_stylePanel.draw();
                g_editorPanel.draw();
            });
        });

        g_editorPanel.setup(editorElem, g_pageList);
        g_editorPanel.selectChanged.add(function(objects) {
            g_propertyPanel.setObjects(objects, function() {
                g_editorPanel.draw();
            })
        });

        var platformSelect = < HTMLSelectElement > document.getElementById("platform");
        platformSelect.addEventListener("change", changePlatform);
        platformSelect.value = g_editorPanel.toolLayer.screen.getPlatform().toString();

        var watchCanvas = new InteractionHelper.Watch(editorElem, g_editorPanel.onPointer.bind(g_editorPanel));

        g_styleList.newGame();
        g_pageList.newGame();
        startup();
    });
}
