// Copyright 2014 Reece Elliott

/// <reference path="_dependencies.ts" />
module LayoutEditor {
    export interface ScreenType {
        platform: Screen.Platform;
        width: number;
        height: number;
    }

    export class Screen {
        private types: ScreenType[] = [{
            platform: Screen.Platform.iPad_Landscape,
            width: 1024,
            height: 672
        }, {
            platform: Screen.Platform.iPad_Portrait,
            width: 768,
            height: 928
        }, {
            platform: Screen.Platform.iPad3_Landscape,
            width: 1024,
            height: 692
        }, {
            platform: Screen.Platform.iPad3_Portrait,
            width: 768,
            height: 928
        }, {
            platform: Screen.Platform.iPhone5_Landscape,
            width: 1136,
            height: 424
        }, {
            platform: Screen.Platform.iPhone5_Portrait,
            width: 640,
            height: 920
        }, {
            platform: Screen.Platform.iPhone4_Landscape,
            width: 960,
            height: 424
        }, {
            platform: Screen.Platform.iPhone4_Portrait,
            width: 640,
            height: 770
        }, {
            platform: Screen.Platform.iPhone_Landscape,
            width: 480,
            height: 255
        }, {
            platform: Screen.Platform.iPhone_Portrait,
            width: 320,
            height: 385
        }, ];

        screenType: ScreenType = null;
        screenChanged = new Helper.Callback < (screenType: ScreenType) => void > ();

        constructor() {
            this.screenType = this.getScreenType(Screen.Platform.iPhone_Portrait);
        }

        getScreenType(platform: Screen.Platform): ScreenType {
            for (var i: number = 0; i < this.types.length; ++i) {
                var type: ScreenType = this.types[i];
                if (type.platform === platform)
                    return type;
            }

            return null;
        }

        setPlatform(platform: Screen.Platform) {
            var screenType: ScreenType = this.getScreenType(platform);
            if (screenType !== null) {
                this.screenType = screenType;
                this.screenChanged.fire(screenType);
            }
        }

        getPlatform(): Screen.Platform {
            return this.screenType.platform;
        }

        draw(ctx, panZoom: PanZoom) {
            if (!this.screenType)
                return;

            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;
            ctx.setLineDash([]);

            ctx.save();
            panZoom.transform(ctx);

            ctx.beginPath();
            ctx.rect(0, 0, this.screenType.width, this.screenType.height);

            ctx.restore();
            ctx.stroke(); // stroke after restore so stroke is not scaled
        }
    }

    export module Screen {
        export enum Platform {
            iPhone_Landscape, iPhone_Portrait,
            iPhone4_Landscape, iPhone4_Portrait,
            iPhone5_Landscape, iPhone5_Portrait,
            iPad_Landscape, iPad_Portrait,
            iPad3_Landscape, iPad3_Portrait
        }
    }
}
