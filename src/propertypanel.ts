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

    export interface PropertyList {
        canHandle: (obj: any) => boolean;
        items: PropertyItem[];
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
            for (var i: number = 1; i < objects.length; ++i) {
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
            for (var i: number = 0; i < this.objects.length; ++i)
                this.objects[i][this.prop] = value;
        }

        constructor(public objects: any[], public prop: string) {}
    }

    export class PropertyPanel {
        objects: any = [];
        propertyLists: PropertyList[] = [];
        width: number = 0; // dummy
        rootElem: HTMLElement = null;
        private editing: PropertyBinding = null;
        private clickHandler = null;
        private bindings: PropertyBinding[] = [];
        private editors: PropertyEditor[] = [];
        private onChangeCallback: () => void = null;

        constructor() {
            this.clickHandler = this.onClick.bind(this);
        }

        reset() {
            this.objects.length = 0;
            this.editing = null;
            this.bindings.length = 0;
            this.onChangeCallback = null;
        }

        private isArraySame(a: any[], b: any[]): boolean {
            if (a.length !== b.length)
                return false;

            for (var i: number = 0; i < a.length; ++i) {
                if (a[i] !== b[i])
                    return false;
            }

            return true;
        }

        setRootElem(rootElem: HTMLElement) {
            if (this.rootElem) {
                this.rootElem.removeEventListener("click", this.clickHandler);
            }

            this.rootElem = rootElem;
            this.rootElem.addEventListener("click", this.clickHandler);
        }

        setObjects(objects: any[], onChangeCallback: () => void) {
            if (!this.isArraySame(this.objects, objects)) {
                this.commitEditing();

                this.objects = objects;
                this.onChangeCallback = onChangeCallback;
                this.bindings.length = 0;

                var rootElem: HTMLElement = this.rootElem;
                while (rootElem.lastChild) {
                    rootElem.removeChild(rootElem.lastChild);
                }

                if (objects.length > 0)
                    this.createBinding(objects, "", "object", null, this.rootElem);
            }

            this.refresh();
        }

        addPropertyList(propertyList: PropertyList) {
            this.propertyLists.push(propertyList);
        }

        getPropertyList(objects: any[]): PropertyList {
            if (objects.length === 0)
                return null;

            // loop backwards as more specific types are listed last
            for (var i: number = this.propertyLists.length - 1; i >= 0; --i) {
                var thisList: PropertyList = this.propertyLists[i];
                var canHandleAll: boolean = true;

                for (var j: number = 0; canHandleAll && j < objects.length; ++j)
                    canHandleAll = thisList.canHandle(objects[j]);

                if (canHandleAll)
                    return thisList;
            }
            return null;
        }

        refresh() {
            for (var i: number = 0; i < this.bindings.length; ++i) {
                var binding: PropertyBinding = this.bindings[i];
                binding.editor.refresh(binding);
            }
        }

        private onClick(e) {
            var elem = e.target;
            var idString: string = "";
            while (elem && !elem.hasAttribute("data-id"))
                elem = elem.parentNode;

            if (!elem)
                return;

            var id: number = parseInt(elem.getAttribute("data-id"));
            var binding: PropertyBinding = this.bindings[id];
            if (binding) {
                this.startEditing(binding);
            }
        }

        startEditing(binding: PropertyBinding) {
            if (this.editing === binding)
                return;

            if (this.editing)
                this.commitEditing();

            this.editing = binding;
            binding.editor.startEdit(binding);
        }

        commitEditing() {
            var binding: PropertyBinding = this.editing;
            if (!binding)
                return;

            binding.editor.commitEdit(binding);
            if (this.onChangeCallback !== null)
                this.onChangeCallback();

            this.editing = null;
        }

        addEditor(editor: PropertyEditor) {
            this.editors.push(editor);
        }

        createBinding(objects: any[], prop: string, editorType: string, propItem: PropertyItem, parentElem: HTMLElement): PropertyBinding {
            var binding: PropertyBinding = new PropertyBinding(objects, prop);
            this.bindings.push(binding);

            var id: number = this.bindings.length - 1;

            // loop backwards, the most specific editors are last
            for (var i: number = this.editors.length - 1; i >= 0; --i) {
                var editor: PropertyEditor = this.editors[i];
                if (editor.canEdit(editorType)) {
                    binding.editor = editor;
                    binding.item = propItem;

                    var elem: HTMLElement = editor.createElement(parentElem, binding);
                    binding.elem = elem;

                    if (elem)
                        elem.setAttribute("data-id", id.toString());
                    break;
                }
            }

            return binding;
        }
    }

    export interface PropertyEditor {
        // returns true if we can edit this type of property
        canEdit(type: string): boolean;

        // creates an element for this binding
        createElement(parentElem: HTMLElement, binding: PropertyBinding): HTMLElement;

        // refreshes the element in binding
        refresh(binding: PropertyBinding);

        // edits the element in binding
        startEdit(binding: PropertyBinding);

        // stops editing the element in binding and commits the result
        commitEdit(binding: PropertyBinding);
    }

    export class TextPropertyEditor implements PropertyEditor {
        inputText: HTMLInputElement;
        regExp: RegExp = null;

        constructor() {}

        public setInputElem(elem: HTMLInputElement) {
            elem.classList.add("inputText");

            elem.addEventListener("change", this.onChange.bind(this));
            elem.addEventListener("input", this.onInput.bind(this));

            this.inputText = elem;
        }

        public canEdit(type: string): boolean {
            return type === "string" || type === "number";
        }

        public createElement(parentElem: HTMLElement, binding: PropertyBinding): HTMLElement {
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
        }

        public refresh(binding: PropertyBinding) {
            var valueSpan: HTMLElement = ( < HTMLElement > binding.elem.lastChild);
            var value = binding.getValue();
            if (!binding.isValueSame())
                value = "----";

            valueSpan.innerHTML = value;
        }

        public startEdit(binding: PropertyBinding) {
            var rectObject = ( < HTMLElement > binding.elem.lastChild).getBoundingClientRect();

            var value = binding.getValue();
            if (!binding.isValueSame())
                value = "----";

            this.inputText.style.top = rectObject.top + "px";
            this.inputText.style.left = rectObject.left + "px";
            this.inputText.value = value.toString();
            this.inputText.type = "input";

            this.inputText.setSelectionRange(0, g_inputText.value.length);
            this.inputText.focus();

            if (typeof binding.item.match !== "undefined")
                this.regExp = new RegExp(binding.item.match);
        }

        public commitEdit(binding: PropertyBinding) {
            if (typeof binding.item.isValid === "undefined" || binding.item.isValid(g_inputText.value)) {
                binding.setValue(g_inputText.value);
            }

            this.inputText.blur();
            this.inputText.type = "hidden";
            this.regExp = null;

            this.refresh(binding);
        }

        private onChange(e) {
            g_propertyPanel.commitEditing();
        }

        private onInput(e) {
            if (this.regExp === null)
                return;

            if (!this.regExp.test(g_inputText.value)) {
                this.inputText.style.color = "red";
            } else {
                this.inputText.style.color = "black";
            }
        }
    }

    export class ObjectPropertyEditor implements PropertyEditor {
        public canEdit(type: string): boolean {
            return type === "object";
        }

        private getType(item: PropertyItem, objects: any[]): string {
            if (objects.length === 0)
                return undefined;

            return item.type || typeof objects[0][item.prop]
        }

        public createElement(parentElem: HTMLElement, binding: PropertyBinding): HTMLElement {
            var objectElem: HTMLElement = null;
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

                // make the object in this property the base object
                for (var i: number = 0; i < objects.length; ++i) {
                    objects[i] = objects[i][binding.prop];
                }
            }

            var propertyList: PropertyList = g_propertyPanel.getPropertyList(objects);

            for (var i: number = 0; i < propertyList.items.length; ++i) {
                var propItem: PropertyItem = propertyList.items[i];
                var prop: string = propItem.prop;
                var type: string = this.getType(propItem, objects);

                if (propItem.allowMultiple === false && objects.length !== 1)
                    continue;

                g_propertyPanel.createBinding(objects, prop, type, propItem, parentElem);
            }

            return objectElem;
        }

        public refresh(binding: PropertyBinding) {
            // do nothing
        }

        public startEdit(binding: PropertyBinding) {
            var wasOpen: boolean = (binding.elem.getAttribute("data-state") === "open");
            binding.state = wasOpen ? "closed" : "open";
            binding.elem.setAttribute("data-state", binding.state);
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
        createElement(parentElem: HTMLElement, binding: PropertyBinding): HTMLElement {
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
        }

        // refreshes the element in binding
        refresh(binding: PropertyBinding) {
            var valueSpan: HTMLElement = ( < HTMLElement > binding.elem.lastChild);

            if (!binding.isValueSame()) {
                valueSpan.innerHTML = "----";
            } else {
                value = binding.getValue();

                var list: ReferenceItem[] = binding.item.getList();
                var value = binding.getValue();

                for (var i: number = 0; i < list.length; ++i) {
                    if (list[i].value === value) {
                        valueSpan.innerHTML = list[i].name;
                        break;
                    }
                }
            }
        }

        // edits the element in binding
        startEdit(binding: PropertyBinding) {
            var rectObject = ( < HTMLElement > binding.elem.lastChild).getBoundingClientRect();

            var list: ReferenceItem[] = binding.item.getList();
            var value = binding.getValue();
            if (!binding.isValueSame())
                value = "----";

            var inputSelect = document.createElement("select");
            inputSelect.classList.add("inputSelect");

            for (var i: number = 0; i < list.length; ++i) {
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
            inputSelect.addEventListener("change", this.onChange.bind(this));
            inputSelect.focus();
        }

        onChange(e) {
            g_propertyPanel.commitEditing();
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

    export
    var g_propertyPanel: PropertyPanel = new PropertyPanel();

    export
    var g_textPropertyEditor = new TextPropertyEditor();

    g_propertyPanel.addEditor(g_textPropertyEditor);
    g_propertyPanel.addEditor(new ObjectPropertyEditor());
    g_propertyPanel.addEditor(new ListPropertyEditor());

    export
    var g_inputText = null;
}
