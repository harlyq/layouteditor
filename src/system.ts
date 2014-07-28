module LayoutEditor {
    export
    var EPSILON = 0.001;

    export interface ReferenceItem {
        value: any;
        name: string;
    }

    //------------------------------
    export interface XY {
        x: number;
        y: number;
    }

    export
    var g_draw: (ctx) => void = null;
}
