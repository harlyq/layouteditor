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

    function uploadData(e) {
        var files = e.target.files;
        if (files.length === 0)
            return;

        var reader = new FileReader();
        reader.onload = function(e) {
            var obj: any = JSON.parse(e.target.result);
            reset();
            g_styleList.loadData(obj.styleList);
            g_editor.loadData(obj.editor);

            g_stylePanel.reset();
            g_editor.draw();
        }
        reader.readAsText(files[0]);
    }

    function reset() {
        ( < HTMLInputElement > document.getElementById("upload")).value = "";

        g_editor.reset();
        g_propertyPanel.reset();
        g_styleList.reset();
        g_stylePanel.reset();

        g_editor.setTool("rectTool");
        shapesSelect();
    }

    function duplicateSelect() {
        g_editor.toolLayer.duplicateSelect();
    }

    function deleteSelect() {
        g_editor.toolLayer.deleteSelect();
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

    function distribute(e) {
        g_editor.toolLayer.distributeSelect(parseInt(e.target.value));
        e.target.value = 0; // reset to None
    }

    function makeSquare() {
        g_editor.toolLayer.makeSquareSelect();
    }

    function newPage(e) {
        g_editor.pageNumber = parseInt(( < HTMLInputElement > e.target).value);
    }

    function addImage(e) {
        var file = e.target.files[0];
        ( < HTMLInputElement > document.getElementById("imageTool")).value = "";
        if (!file)
            return;

        var reader = new FileReader();
        reader.onloadend = function(e) {
            g_editor.toolLayer.addImage(reader.result);
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
        document.getElementById("upload").addEventListener("change", uploadData);
        document.getElementById("makeSquare").addEventListener("click", makeSquare);
        document.getElementById("distribute").addEventListener("change", distribute);
        document.getElementById("page").addEventListener("change", newPage);
        document.getElementById("imageTool").addEventListener("change", addImage);

        g_inputText = document.getElementById("inputText");
        g_inputMultiLine = document.getElementById("inputMultiLine");

        // g_propertyTool = new PropertyTool();
        g_propertyPanel.setRootElem(document.getElementById("PropertyPanel"));
        g_textPropertyEditor.setInputElem(g_inputText);

        g_stylePanel.setRootElem(document.getElementById("layoutStyles"));
        g_stylePanel.selectChanged.add(function(styles: Style[]) {
            g_propertyPanel.setObjects(styles, function() {
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
