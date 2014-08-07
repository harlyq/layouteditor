// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {

    export class PropertyPanel {
        objects: any = [];
        rootElem: HTMLElement = null;
        editorList: EditorList = null;

        private editing: PropertyBinding = null;
        private clickHandler = null;
        private bindings: PropertyBinding[] = [];
        private onChangeCallback: () => void = null;

        constructor() {
            this.clickHandler = this.onClick.bind(this);
        }

        reset() {
            this.objects.length = 0;
            this.editing = null;
            this.bindings.length = 0;
            this.onChangeCallback = null;

            var rootElem: HTMLElement = this.rootElem;
            while (rootElem !== null && rootElem.lastChild) {
                rootElem.removeChild(rootElem.lastChild);
            }
        }

        private isArraySame(a: any[], b: any[]): boolean {
            if (a.length !== b.length)
                return false;

            for (var i = 0; i < a.length; ++i) {
                if (a[i] !== b[i])
                    return false;
            }

            return true;
        }

        private getType(item: PropertyItem, objects: any[]): string {
            if (objects.length === 0)
                return undefined;

            return item.type || typeof objects[0][item.prop]
        }

        setup(rootElem: HTMLElement, editorList: EditorList) {
            if (this.rootElem) {
                this.rootElem.removeEventListener("click", this.clickHandler);
            }

            this.rootElem = rootElem;
            this.rootElem.addEventListener("click", this.clickHandler);
            this.editorList = editorList;

            this.reset();
        }

        setObjects(objects: any[], onChangeCallback: () => void) {
            if (!this.isArraySame(this.objects, objects)) {
                this.commitEditing();

                this.reset();
                this.objects = objects.slice(); // copy
                this.onChangeCallback = onChangeCallback;
                this.bindings.length = 0;

                if (objects.length > 0)
                    this.createBinding(objects, "", "object", null, this.rootElem);
            }

            this.refresh();
        }

        refresh() {
            for (var i = 0; i < this.bindings.length; ++i) {
                var binding: PropertyBinding = this.bindings[i];
                binding.editor.refresh(binding);
            }
        }

        private onClick(e) {
            var elem = e.target;
            var idString: string = "";
            while (elem && elem != document && !elem.hasAttribute("data-id"))
                elem = elem.parentNode;

            if (!elem)
                return;

            var id = parseInt(elem.getAttribute("data-id"));
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
            binding.editor.startEdit(binding, this.commitEditing.bind(this));
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

        createBinding(objects: any[], prop: string, editorType: string, propItem: PropertyItem, parentElem: HTMLElement): PropertyBinding {
            var binding: PropertyBinding = new PropertyBinding(objects, prop);
            this.bindings.push(binding);

            var id = this.bindings.length - 1;

            // loop backwards, the most specific editors are last
            for (var i = this.editorList.editors.length - 1; i >= 0; --i) {
                var editor: PropertyEditor = this.editorList.editors[i];
                if (!editor.canEdit(editorType))
                    continue;

                binding.editor = editor;
                binding.item = propItem;

                var editorElement = editor.createElement(parentElem, binding);
                var elem = editorElement.element;

                if (elem) {
                    elem.setAttribute("data-id", id.toString());
                    binding.elem = elem;

                    if (editorElement.recurse) {
                        this.recurseBinding(objects, prop, elem);
                    }
                }
                break;
            }

            return binding;
        }

        recurseBinding(objects: any[], parentProp: string, parentElem: HTMLElement) {
            var subObjects = objects.slice();

            if (parentProp.length > 0) {
                for (var i = 0; i < objects.length; ++i) {
                    subObjects[i] = objects[i][parentProp];
                }
            }

            var definition = g_propertyList.getDefinition(subObjects);

            for (var i = 0; i < definition.items.length; ++i) {
                var propItem: PropertyItem = definition.items[i];
                var prop: string = propItem.prop;
                var type: string = this.getType(propItem, subObjects);

                if (propItem.allowMultiple === false && objects.length !== 1)
                    continue;

                this.createBinding(subObjects, prop, type, propItem, parentElem);
            }
        }
    }

}
