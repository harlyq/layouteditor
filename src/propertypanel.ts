/// <reference path='_dependencies.ts' />
module LayoutEditor {

    export interface PropertyItem {
        prop: string;
        type ? : string;
        getList ? : () => LayoutEditor.ReferenceItem[];
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

        constructor(public object: any, public prop: string) {}
    }

    export class PropertyPanel {
        object: any = null;
        propertyLists: PropertyList[] = [];
        width: number = 0; // dummy
        rootElem: HTMLElement = null;
        private editing: PropertyBinding = null;
        private clickHandler = null;
        private bindings: PropertyBinding[] = [];
        private editors: PropertyEditor[] = [];
        private onChangeCallback: () => void = null;

        constructor() {
            var self = this;
            this.clickHandler = function(e) {
                self.onClick(e);
            }
        }

        setRootElem(rootElem: HTMLElement) {
            if (this.rootElem) {
                this.rootElem.removeEventListener('click', this.clickHandler);
            }

            this.rootElem = rootElem;
            this.rootElem.addEventListener('click', this.clickHandler);
        }

        setObject(obj: any, onChangeCallback: () => void) {
            if (this.object !== obj) {
                this.object = obj;
                this.onChangeCallback = onChangeCallback;
                this.bindings.length = 0;

                var rootElem: HTMLElement = this.rootElem;
                while (rootElem.lastChild) {
                    rootElem.removeChild(rootElem.lastChild);
                }

                this.createBinding(obj, "", "object", null, this.rootElem);
            }

            this.refresh();
        }

        addPropertyList(propertyList: PropertyList) {
            this.propertyLists.push(propertyList);
        }

        getPropertyList(obj: any) {
            // loop backwards as more specific types are listed last
            for (var i: number = this.propertyLists.length - 1; i >= 0; --i) {
                if (this.propertyLists[i].canHandle(obj))
                    return this.propertyLists[i];
            }
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
            while (elem && !elem.hasAttribute('data-id'))
                elem = elem.parentNode;

            if (!elem)
                return;

            var id: number = parseInt(elem.getAttribute('data-id'));
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

        createBinding(object: any, prop: string, editorType: string, propItem: PropertyItem, parentElem: HTMLElement): PropertyBinding {
            var binding: PropertyBinding = new PropertyBinding(object, prop);
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
                        elem.setAttribute('data-id', id.toString());
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

        constructor() {}

        public setInputElem(elem: HTMLInputElement) {
            elem.classList.add('inputText');

            var self = this;
            elem.addEventListener("change", function(e) {
                self.onChange(e);
            })

            this.inputText = elem;
        }

        public canEdit(type: string): boolean {
            return type === "string" || type === "number";
        }

        public createElement(parentElem: HTMLElement, binding: PropertyBinding): HTMLElement {
            var textDiv = document.createElement('div');
            textDiv.classList.add('propertyText');
            var nameSpan = document.createElement('span');
            var valueSpan = document.createElement('span');

            nameSpan.innerHTML = binding.prop + ": ";

            textDiv.appendChild(nameSpan);
            textDiv.appendChild(valueSpan);

            binding.elem = textDiv;
            this.refresh(binding);

            parentElem.appendChild(textDiv);

            return textDiv;
        }

        public refresh(binding: PropertyBinding) {
            ( < HTMLElement > binding.elem.lastChild).innerHTML = binding.object[binding.prop];
        }

        public startEdit(binding: PropertyBinding) {
            var rectObject = ( < HTMLElement > binding.elem.lastChild).getBoundingClientRect();

            this.inputText.style.top = rectObject.top + 'px';
            this.inputText.style.left = rectObject.left + 'px';
            this.inputText.value = binding.object[binding.prop].toString();
            this.inputText.type = 'input';

            this.inputText.setSelectionRange(0, g_inputText.value.length);
            this.inputText.focus();
        }

        public commitEdit(binding: PropertyBinding) {
            binding.object[binding.prop] = g_inputText.value;

            this.inputText.blur();
            this.inputText.type = 'hidden';

            this.refresh(binding);
        }

        private onChange(e) {
            g_propertyPanel.commitEditing();
        }
    }

    export class ObjectPropertyEditor implements PropertyEditor {
        public canEdit(type: string): boolean {
            return type === "object";
        }

        public createElement(parentElem: HTMLElement, binding: PropertyBinding): HTMLElement {
            var objectElem: HTMLElement = null;
            var object = binding.object;

            if (binding.prop.length !== 0) {
                // this is a sub-element
                binding.state = 'closed';
                objectElem = document.createElement('div');
                objectElem.innerHTML = binding.prop;
                objectElem.classList.add('propertyObject');
                objectElem.setAttribute('data-state', binding.state);

                parentElem.appendChild(objectElem);
                parentElem = objectElem; // make this the new parent

                object = object[binding.prop]; // inspect the object in this property
            }

            var propertyList: PropertyList = g_propertyPanel.getPropertyList(object);
            Helper.assert(propertyList !== null);

            for (var i: number = 0; i < propertyList.items.length; ++i) {
                var propItem: PropertyItem = propertyList.items[i];
                var prop: string = propItem.prop;
                var type: string = propItem.type || typeof object[prop];

                g_propertyPanel.createBinding(object, prop, type, propItem, parentElem);
            }

            return objectElem;
        }

        public refresh(binding: PropertyBinding) {
            // do nothing
        }

        public startEdit(binding: PropertyBinding) {
            var wasOpen: boolean = (binding.elem.getAttribute('data-state') === 'open');
            binding.state = wasOpen ? 'closed' : 'open';
            binding.elem.setAttribute('data-state', binding.state);
        }

        public commitEdit(binding: PropertyBinding) {
            // do nothing
        }
    }

    export class ListPropertyEditor implements PropertyEditor {
        // returns true if we can edit this type of property
        canEdit(type: string): boolean {
            return type === 'list';
        }

        // creates an element for this binding
        createElement(parentElem: HTMLElement, binding: PropertyBinding): HTMLElement {
            var textDiv = document.createElement('div');
            textDiv.classList.add('propertyText');
            var nameSpan = document.createElement('span');
            var valueSpan = document.createElement('span');

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
            var list: ReferenceItem[] = binding.item.getList();
            var value = binding.object[binding.prop];

            for (var i: number = 0; i < list.length; ++i) {
                if (list[i].value === value) {
                    ( < HTMLElement > binding.elem.lastChild).innerHTML = list[i].name;
                    break;
                }
            }
        }

        // edits the element in binding
        startEdit(binding: PropertyBinding) {
            var rectObject = ( < HTMLElement > binding.elem.lastChild).getBoundingClientRect();

            var list: ReferenceItem[] = binding.item.getList();
            var selected = binding.object[binding.prop];

            var inputSelect = document.createElement('select');
            inputSelect.classList.add('inputSelect');

            for (var i: number = 0; i < list.length; ++i) {
                var item: ReferenceItem = list[i];
                var option = document.createElement('option');

                option.setAttribute('value', item.name);
                option.innerHTML = item.name;
                if (selected == item.value)
                    option.setAttribute('selected', 'selected');

                inputSelect.appendChild(option);
            }
            binding.elem.appendChild(inputSelect);

            inputSelect.style.top = rectObject.top + 'px';
            inputSelect.style.left = rectObject.left + 'px';
            // inputSelect.style.height = '20px';
            // inputSelect.style.width = '100px';
            var sizeStr: string = Math.min(10, list.length).toString();
            inputSelect.setAttribute('size', sizeStr);
            inputSelect.setAttribute('expandto', sizeStr);

            inputSelect.addEventListener('change', this.onChange.bind(this));

            inputSelect.focus();
        }

        onChange(e) {
            g_propertyPanel.commitEditing();
        }

        // stops editing the element in binding and commits the result
        commitEdit(binding: PropertyBinding) {
            var inputSelect: any = binding.elem.lastChild;
            var list: ReferenceItem[] = binding.item.getList();
            binding.object[binding.prop] = list[inputSelect.selectedIndex].value;

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
