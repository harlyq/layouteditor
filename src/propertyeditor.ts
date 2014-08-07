// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {

    export interface PropertyItem {
        prop: string;
        type ? : string;
        match ? : string;
        allowMultiple ? : boolean; // if false, can only edit when a single object is selected
        getList ? : () => LayoutEditor.ReferenceItem[];
        isValid ? : (value) => boolean;
    }

    export class EditorDefinition {
        canHandle: (obj: any) => boolean = null;
        items: PropertyItem[] = [];

        copy(other: EditorDefinition): EditorDefinition {
            this.canHandle = other.canHandle;
            this.items = other.items.slice(); // copy
            return this;
        }

        clone(): EditorDefinition {
            var newList = new EditorDefinition();
            newList.copy(this);
            return newList;
        }
    }

    export class EditorElement {
        constructor(public element: HTMLElement, public recurse: boolean = false) {}
    }

    export class PropertyList {
        private definitions: EditorDefinition[] = [];

        addEditorDefintion(definition: EditorDefinition) {
            this.definitions.push(definition)
        }

        getDefinition(objects: any[]): EditorDefinition {
            if (objects.length === 0)
                return null;

            // loop backwards as more specific types are listed last
            for (var i = this.definitions.length - 1; i >= 0; --i) {
                var definition = this.definitions[i];
                var canHandleAll: boolean = true;

                for (var j = 0; canHandleAll && j < objects.length; ++j)
                    canHandleAll = definition.canHandle(objects[j]);

                if (canHandleAll)
                    return definition;
            }
            return null;
        }

    }

    export class PropertyBinding {
        elem: HTMLElement = null;
        state: string = "";
        editor: PropertyEditor = null;
        item: PropertyItem = null;

        isValueSame(): boolean {
            var objects = this.objects;
            if (objects.length === 0)
                return false;

            var value = objects[0][this.prop];
            for (var i = 1; i < objects.length; ++i) {
                if (objects[i][this.prop] !== value)
                    return false;
            }

            return true;
        }

        getValue(): any {
            if (this.objects.length > 0)
                return this.objects[0][this.prop];

            return undefined;
        }

        setValue(value) {
            for (var i = 0; i < this.objects.length; ++i)
                this.objects[i][this.prop] = value;
        }

        constructor(public objects: any[], public prop: string) {}
    }

    export interface PropertyEditor {
        // returns true if we can edit this type of property
        canEdit(type: string): boolean;

        // creates an element for this binding
        createElement(parentElem: HTMLElement, binding: PropertyBinding): EditorElement;

        // refreshes the element in binding
        refresh(binding: PropertyBinding);

        // edits the element in binding
        startEdit(binding: PropertyBinding, onComplete: () => void);

        // stops editing the element in binding and commits the result
        commitEdit(binding: PropertyBinding);
    }

    export class BooleanPropertyEditor implements PropertyEditor {
        value: any;

        constructor() {}

        public canEdit(type: string): boolean {
            return type === "boolean";
        }

        public createElement(parentElem: HTMLElement, binding: PropertyBinding): EditorElement {
            var nameDiv = document.createElement("div");
            nameDiv.classList.add("propertyText");

            binding.elem = nameDiv;
            this.refresh(binding);

            parentElem.appendChild(nameDiv);

            return new EditorElement(nameDiv);
        }

        public refresh(binding: PropertyBinding) {
            var nameDiv: HTMLElement = ( < HTMLElement > binding.elem);
            var value = binding.getValue();
            if (!binding.isValueSame())
                value = "----";
            else if (value)
                value = "&#x2612";
            else
                value = "&#x2610";

            nameDiv.innerHTML = binding.prop + ": " + value;
        }

        public startEdit(binding: PropertyBinding, onComplete: () => void) {
            var value = binding.getValue();
            this.value = !value;
            onComplete();
        }

        public commitEdit(binding: PropertyBinding) {
            binding.setValue(this.value !== false);

            this.refresh(binding);
        }
    }

    export class TextPropertyEditor implements PropertyEditor {
        constructor() {}

        public canEdit(type: string): boolean {
            return type === "string" || type === "number";
        }

        public createElement(parentElem: HTMLElement, binding: PropertyBinding): EditorElement {
            var textDiv = document.createElement("div");
            var nameSpan = document.createElement("span");
            var valueSpan = document.createElement("span");

            valueSpan.classList.add("TextPropertyEditorValue");
            nameSpan.innerHTML = binding.prop + ": ";

            textDiv.classList.add("propertyText");
            textDiv.appendChild(nameSpan);
            textDiv.appendChild(valueSpan);

            binding.elem = textDiv;

            this.refresh(binding);

            parentElem.appendChild(textDiv);

            return new EditorElement(textDiv);
        }

        public refresh(binding: PropertyBinding) {
            var valueSpan: HTMLElement = ( < HTMLElement > binding.elem.querySelector(".TextPropertyEditorValue"));
            var value = binding.getValue();

            if (!binding.isValueSame())
                value = "----";

            valueSpan.innerHTML = value;
        }

        public startEdit(binding: PropertyBinding, onComplete: () => void) {
            var rectObject = binding.elem.querySelector(".TextPropertyEditorValue").getBoundingClientRect();
            var value = binding.getValue();
            var inputText = document.createElement("input");

            if (!binding.isValueSame())
                value = "----";

            inputText.classList.add("inputText");
            inputText.classList.add("TextPropertyEditorInput");
            inputText.style.top = rectObject.top + "px";
            inputText.style.left = rectObject.left + "px";
            inputText.value = value.toString();
            inputText.type = "input";

            inputText.addEventListener("change", function(e) {
                onComplete();
            });

            inputText.addEventListener("input", function(e) {
                if (typeof binding.item.match === "undefined")
                    return;

                var regExp = new RegExp(binding.item.match);

                if (!regExp.test(inputText.value))
                    inputText.style.color = "red";
                else
                    inputText.style.color = "black";
            });

            ( < HTMLElement > binding.elem).appendChild(inputText);

            inputText.setSelectionRange(0, inputText.value.length);
            inputText.focus();
        }

        public commitEdit(binding: PropertyBinding) {
            var inputText = ( < HTMLInputElement > binding.elem.querySelector(".TextPropertyEditorInput"));
            if (typeof binding.item.isValid === "undefined" || binding.item.isValid(inputText.value)) {
                binding.setValue(inputText.value);
            }

            binding.elem.removeChild(inputText);
            this.refresh(binding);
        }
    }

    export class ObjectPropertyEditor implements PropertyEditor {
        public canEdit(type: string): boolean {
            return type === "object";
        }

        public createElement(parentElem: HTMLElement, binding: PropertyBinding): EditorElement {
            if (binding.prop.length === 0)
                binding.state = "open";
            else
            // this is a sub-element
                binding.state = "closed";

            var objectElem = document.createElement("div");
            objectElem.innerHTML = binding.prop;
            objectElem.classList.add("propertyObject");
            objectElem.setAttribute("data-state", binding.state);

            parentElem.appendChild(objectElem);

            return new EditorElement(objectElem, true); // recurse
        }

        public refresh(binding: PropertyBinding) {
            // do nothing
        }

        public startEdit(binding: PropertyBinding, onComplete: () => void) {
            var wasOpen: boolean = (binding.elem.getAttribute("data-state") === "open");
            binding.state = wasOpen ? "closed" : "open";
            binding.elem.setAttribute("data-state", binding.state);
            onComplete();
        }

        public commitEdit(binding: PropertyBinding) {
            // do nothing
        }
    }

    export class ListPropertyEditor implements PropertyEditor {
        // returns true if we can edit this type of property
        canEdit(type: string): boolean {
            return type === "list";
        }

        // creates an element for this binding
        createElement(parentElem: HTMLElement, binding: PropertyBinding): EditorElement {
            var textDiv = document.createElement("div");
            var nameSpan = document.createElement("span");
            var valueSpan = document.createElement("span");

            nameSpan.innerHTML = binding.prop + ": ";

            textDiv.classList.add("propertyText");
            textDiv.appendChild(nameSpan);
            textDiv.appendChild(valueSpan);

            binding.elem = textDiv;
            this.refresh(binding);

            parentElem.appendChild(textDiv);

            return new EditorElement(textDiv);
        }

        // refreshes the element in binding
        refresh(binding: PropertyBinding) {
            var valueSpan: HTMLElement = ( < HTMLElement > binding.elem.lastChild);

            if (!binding.isValueSame()) {
                valueSpan.innerHTML = "----";
            } else {
                var list: ReferenceItem[] = binding.item.getList();
                var value = binding.getValue();

                for (var i = 0; i < list.length; ++i) {
                    if (list[i].value === value) {
                        valueSpan.innerHTML = list[i].name;
                        break;
                    }
                }
            }
        }

        // edits the element in binding
        startEdit(binding: PropertyBinding, onComplete: () => void) {
            var rectObject = ( < HTMLElement > binding.elem.lastChild).getBoundingClientRect();

            var list: ReferenceItem[] = binding.item.getList();
            var value = binding.getValue();
            if (!binding.isValueSame())
                value = "----";

            var inputSelect = document.createElement("select");
            inputSelect.classList.add("inputSelect");

            for (var i = 0; i < list.length; ++i) {
                var item: ReferenceItem = list[i];
                var option = document.createElement("option");

                option.setAttribute("value", item.name);
                option.innerHTML = item.name;
                if (value == item.value)
                    option.setAttribute("selected", "selected");

                inputSelect.appendChild(option);
            }
            binding.elem.appendChild(inputSelect);

            var sizeStr: string = Math.min(10, list.length).toString();

            inputSelect.style.top = rectObject.top + "px";
            inputSelect.style.left = rectObject.left + "px";
            inputSelect.setAttribute("size", sizeStr);
            inputSelect.setAttribute("expandto", sizeStr);
            inputSelect.addEventListener("change", function(e) {
                onComplete();
            });

            inputSelect.focus();
        }

        // stops editing the element in binding and commits the result
        commitEdit(binding: PropertyBinding) {
            var inputSelect: any = binding.elem.lastChild;
            var list: ReferenceItem[] = binding.item.getList();
            var value = list[inputSelect.selectedIndex].value;

            if (typeof binding.item.isValid === "undefined" || binding.item.isValid(value)) {
                binding.setValue(value);
            }

            binding.elem.removeChild(inputSelect);

            this.refresh(binding);
        }
    }

    export class EditorList {
        editors: PropertyEditor[] = [];

        addEditor(editor: PropertyEditor) {
            this.editors.push(editor);
        }
    }

    export
    var g_propertyList = new PropertyList();
    export
    var g_editorList = new EditorList();

    g_editorList.addEditor(new TextPropertyEditor());
    g_editorList.addEditor(new BooleanPropertyEditor());
    g_editorList.addEditor(new ObjectPropertyEditor());
    g_editorList.addEditor(new ListPropertyEditor());

}
