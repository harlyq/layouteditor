module Helper {
    export

    function assert(cond: boolean) {
        if (!cond)
            debugger;
    }

    export

    function extend(obj: any, props: any): any {
        if (!obj)
            obj = {};
        for (var key in props) {
            if (props.hasOwnProperty(key)) {
                if (typeof props[key] === "object") {
                    extend(obj[key], props[key]);
                } else {
                    obj[key] = props[key];
                }
            }
        }
        return obj;
    }

    export

    function arrayMin(list: number[], offset: number = 0, stride: number = 1): number {
        if (list.length <= offset)
            return 0;

        var min = list[offset];
        for (var i: number = offset + stride; i < list.length; i += stride) {
            var val = list[i];
            if (val < min)
                min = val;
        }
        return min;
    }

    export

    function arrayMax(list: number[], offset: number = 0, stride: number = 1): number {
        if (list.length <= offset)
            return 0;

        var max = list[offset];
        for (var i: number = offset + stride; i < list.length; i += stride) {
            var val = list[i];
            if (val > max)
                max = val;
        }
        return max;
    }

    export

    function getIndexOfSorted(list: any[], value: number, valueFunc ? : (list: any[], index: number) => number): number {
        var numList: number = list.length;
        if (numList === 0)
            return -1;
        if (typeof valueFunc === "undefined")
            valueFunc = function(list, index) {
                return list[index];
            };

        var i: number = 0;
        var j: number = numList - 1;
        var mid: number = 0;
        var midValue: number = 0;
        do {
            mid = (i + j) >> 1;
            midValue = valueFunc(list, mid);
            if (value === midValue)
                return mid; // found the value

            if (value < midValue) {
                j = mid - 1;
            } else {
                i = mid + 1;
            }
        } while (i <= j);

        return i; // value is less than this index
    }
}
