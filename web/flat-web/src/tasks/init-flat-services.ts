import { FlatI18n } from "@netless/flat-i18n";
import { routeConfig } from "@netless/flat-pages/src/route-config";

import monacoSVG from "@netless/flat-pages/src/assets/image/tool-monaco.svg";
import geogebraSVG from "@netless/flat-pages/src/assets/image/tool-geogebra.svg";
import countdownSVG from "@netless/flat-pages/src/assets/image/tool-countdown.svg";
import selectorSVG from "@netless/flat-pages/src/assets/image/tool-selector.svg";
import diceSVG from "@netless/flat-pages/src/assets/image/tool-dice.svg";
import mindmapSVG from "@netless/flat-pages/src/assets/image/tool-mindmap.svg";
import quillSVG from "@netless/flat-pages/src/assets/image/tool-quill.svg";
import saveSVG from "@netless/flat-pages/src/assets/image/tool-save.svg";
import presetsSVG from "@netless/flat-pages/src/assets/image/tool-presets.svg";

import { FlatServiceProviderFile, FlatServices, Toaster } from "@netless/flat-services";
import { message } from "antd";
import { generatePath } from "react-router-dom";
import { Remitter } from "remitter";
import { combine } from "value-enhancer";
import { globalStore } from "@netless/flat-stores";
import { Region } from "@netless/flat-server-api";

// 添加设备类型检测函数
const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

export function initFlatServices(): void {
    const config = globalStore.serverRegionConfig;
    if (!config) {
        throw new Error("Missing server region config");
    }

    const toaster = createToaster();
    const flatI18n = FlatI18n.getInstance();

    const flatServices = FlatServices.getInstance();

    flatServices.register(
        "file",
        async () =>
            new FlatServiceProviderFile({
                flatServices,
                toaster,
                flatI18n,
                openPreviewWindow: file => {
                    window.open(
                        generatePath(routeConfig.FilePreviewPage.path, {
                            file: encodeURIComponent(JSON.stringify(file)),
                        }),
                        "_blank",
                    );
                },
            }),
    );

    flatServices.register("videoChat", async () => {
        const { AgoraRTCWeb } = await import("@netless/flat-service-provider-agora-rtc-web");
        return new AgoraRTCWeb({ APP_ID: config.agora.appId });
    });

    flatServices.register("textChat", async () => {
        const { AgoraRTM2 } = await import("@netless/flat-service-provider-agora-rtm2");
        return new AgoraRTM2(config.agora.appId);
    });

    flatServices.register("whiteboard", async () => {
        const { Fastboard, register, stockedApps } = await import(
            "@netless/flat-service-provider-fastboard"
        );
        void register({
            kind: "Monaco",
            appOptions: {
                loader: {
                    paths: {
                        vs: "https://flat-storage.oss-cn-hangzhou.aliyuncs.com/flat-resources/library/monaco-editor@0.27.0/min/vs",
                    },
                },
            },
            src: () => import("@netless/app-monaco"),
        });
        void register({
            kind: "Countdown",
            src: () => import("@netless/app-countdown"),
        });
        void register({
            kind: "GeoGebra",
            src: () => import("@netless/app-geogebra"),
            appOptions: {
                // TODO: replace it with non-country specific url
                HTML5Codebase:
                    "https://flat-storage-cn-hz.whiteboard.agora.io/GeoGebra/HTML5/5.0/web3d",
            },
        });
        void register({
            kind: "Selector",
            src: () => import("@netless/app-selector"),
        });
        void register({
            kind: "Dice",
            src: () => import("@netless/app-dice"),
        });
        void register({
            kind: "MindMap",
            src: () => import("@netless/app-mindmap"),
        });
        void register({
            kind: "Quill",
            src: () => import("@netless/app-quill"),
        });
        void register({
            kind: "IframeBridge",
            src: () => import("@netless/app-iframe-bridge"),
        });

        const service = new Fastboard({
            APP_ID: config.whiteboard.appId,
            toaster,
            flatI18n,
            flatInfo: {
                platform: isMobile() ? "h5" : "web",
                ua: process.env.FLAT_UA,
                region: process.env.FLAT_REGION,
                version: process.env.VERSION,
            },
        });

        // 为移动设备添加特殊配置
        if (isMobile()) {
            // 监听APP创建完成事件
            service._app$.subscribe(app => {
                if (app) {
                    try {
                        // 配置移动设备上的白板参数
                        const room = app.room;
                        
                        // 增大笔触宽度，使其在触摸设备上更易使用
                        const memberState = room.state.memberState;
                        room.setMemberState({
                            ...memberState,
                            strokeWidth: Math.max(memberState.strokeWidth || 2, 4),
                        });
                        
                        // 白板UI适配
                        window.addEventListener("resize", () => {
                            // 窗口大小变化时更新白板视图
                            app.manager.refresh();
                        });
                    } catch (error) {
                        console.error("移动设备适配白板失败", error);
                    }
                }
            });
        }

        service.sideEffect.addDisposer(
            combine([service._app$, flatI18n.$Val.language$]).subscribe(([_app, _lang]) => {
                stockedApps.clear();
                stockedApps.push(
                    {
                        kind: "Monaco",
                        icon: monacoSVG,
                        label: flatI18n.t("tool.monaco"),
                        onClick: app => app.manager.addApp({ kind: "Monaco" }),
                    },
                    {
                        kind: "GeoGebra",
                        icon: geogebraSVG,
                        label: flatI18n.t("tool.geogebra"),
                        onClick: app =>
                            app.manager.addApp({
                                kind: "GeoGebra",
                                attributes: { uid: app.room.uid },
                            }),
                    },
                    {
                        kind: "Countdown",
                        icon: countdownSVG,
                        label: flatI18n.t("tool.countdown"),
                        onClick: app => app.manager.addApp({ kind: "Countdown" }),
                    },
                    {
                        kind: "Selector",
                        icon: selectorSVG,
                        label: flatI18n.t("tool.selector"),
                        onClick: app => app.manager.addApp({ kind: "Selector" }),
                    },
                    {
                        kind: "Dice",
                        icon: diceSVG,
                        label: flatI18n.t("tool.dice"),
                        onClick: app => app.manager.addApp({ kind: "Dice" }),
                    },
                    {
                        kind: "MindMap",
                        icon: mindmapSVG,
                        label: flatI18n.t("tool.mindmap"),
                        onClick: app => {
                            // HACK: workaround app-monaco defines a `define` in global scope,
                            // and mindmap uses an AMD module that will break in this case.
                            (window as any).define = undefined;
                            app.manager.addApp({ kind: "MindMap", options: { title: "MindMap" } });
                        },
                    },
                    {
                        kind: "Quill",
                        icon: quillSVG,
                        label: flatI18n.t("tool.quill"),
                        onClick: app => app.manager.addApp({ kind: "Quill" }),
                    },
                    {
                        kind: "Save",
                        icon: saveSVG,
                        label: flatI18n.t("tool.save"),
                        onClick: () => {
                            service.events.emit("exportAnnotations");
                        },
                    },
                    {
                        kind: "Presets",
                        icon: presetsSVG,
                        label: flatI18n.t("tool.presets"),
                        onClick: () => {
                            service.events.emit("insertPresets");
                        },
                    },
                );
            }),
        );

        return service;
    });

    flatServices.register("recording", async () => {
        const { AgoraCloudRecording } = await import(
            "@netless/flat-service-provider-agora-cloud-recording"
        );
        return new AgoraCloudRecording();
    });

    flatServices.register(
        [
            "file-convert:doc",
            "file-convert:docx",
            "file-convert:ppt",
            "file-convert:pptx",
            "file-convert:pdf",
        ],
        async () => {
            const { FileConvertNetless } = await import(
                "@netless/flat-service-provider-file-convert-netless"
            );
            return new FileConvertNetless(config.whiteboard.convertRegion as Region);
        },
    );

    flatServices.register(
        [
            "file-insert:jpg",
            "file-insert:jpeg",
            "file-insert:png",
            "file-insert:webp",
            "file-insert:mp3",
            "file-insert:mp4",
            "file-insert:doc",
            "file-insert:docx",
            "file-insert:ppt",
            "file-insert:pptx",
            "file-insert:pdf",
        ],
        async () => {
            if (flatServices.isCreated("whiteboard")) {
                const { Fastboard, FastboardFileInsert } = await import(
                    "@netless/flat-service-provider-fastboard"
                );
                const service = await flatServices.requestService("whiteboard");
                if (service instanceof Fastboard) {
                    return new FastboardFileInsert(
                        service,
                        flatI18n,
                        toaster,
                        config.whiteboard.convertRegion as Region,
                    );
                }
            }
            return null;
        },
    );

    flatServices.register(
        ["file-preview:doc", "file-preview:docx", "file-preview:ppt", "file-preview:pdf"],
        async () => {
            const { FilePreviewNetless } = await import(
                "@netless/flat-service-provider-file-preview-netless"
            );
            return new FilePreviewNetless(config.whiteboard.convertRegion as Region);
        },
    );

    flatServices.register("file-preview:pptx", async () => {
        const { FilePreviewNetlessSlide } = await import(
            "@netless/flat-service-provider-file-preview-netless-slide"
        );
        return new FilePreviewNetlessSlide(config.whiteboard.convertRegion as Region);
    });
}

function createToaster(): Toaster {
    const toaster: Toaster = new Remitter();
    toaster.on("info", info => message.info(info));
    toaster.on("error", error => message.error(error));
    toaster.on("warn", warn => message.warn(warn));
    return toaster;
}
