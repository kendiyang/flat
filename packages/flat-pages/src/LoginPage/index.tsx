import "./style.less";

import React, { useMemo, useState, useEffect } from "react";
import { useLanguage } from "@netless/flat-i18n";
import { observer } from "mobx-react-lite";
import { wrap } from "./utils/disposer";
import { useLoginState } from "./utils/state";
import { WeChatLogin } from "./WeChatLogin";
import {
    PRIVACY_URL_CN_CN,
    PRIVACY_URL_CN_EN,
    PRIVACY_URL_EN_CN,
    PRIVACY_URL_EN_EN,
    SERVICE_URL_CN_CN,
    SERVICE_URL_CN_EN,
    SERVICE_URL_EN_CN,
    SERVICE_URL_EN_EN,
} from "../constants/process";
import { useSafePromise } from "../utils/hooks/lifecycle";
import { AppUpgradeModal } from "../components/AppUpgradeModal";

import {
    LoginPanel,
    LoginWithCode,
    LoginWithPassword,
    BindingPhonePanel,
    QRCodePanel,
    RegisterModal,
    LoginKeyType,
    PasswordLoginType,
    LoginButtonProviderType,
    RebindingPhonePanel,
} from "flat-components";
import {
    bindingPhone,
    bindingPhoneSendCode,
    loginEmailWithPwd,
    loginPhoneWithPwd,
    loginPhone,
    loginPhoneSendCode,
    resetPhoneSendCode,
    resetEmailSendCode,
    resetPwdWithEmail,
    resetPwdWithPhone,
    registerEmail,
    registerPhone,
    registerEmailSendCode,
    registerPhoneSendCode,
    rebindingPhoneSendCode,
    rebindingPhone,
    FLAT_REGION,
} from "@netless/flat-server-api";
import { globalStore } from "@netless/flat-stores";

// 添加设备类型检测函数
const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

export const LoginPage = observer(function LoginPage() {
    const language = useLanguage();
    const sp = useSafePromise();
    const [phone, setBindingPhone] = useState("");
    const [isMobileDevice, setIsMobileDevice] = useState(false);
    
    // 检测设备类型
    useEffect(() => {
        setIsMobileDevice(isMobile());
        
        const handleResize = () => {
            setIsMobileDevice(isMobile());
        };
        
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    // 处理移动设备键盘弹出时的布局调整
    useEffect(() => {
        if (!isMobileDevice) return;
        
        // 键盘弹出时，某些移动浏览器会改变视口高度
        const handleVisualViewportResize = () => {
            const loginContainer = document.querySelector(".login-page-container");
            if (!loginContainer) return;
            
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            const windowHeight = window.innerHeight;
            
            // 如果视口高度小于窗口高度，说明键盘已经弹出
            if (viewportHeight < windowHeight * 0.8) {
                // 调整登录容器样式，确保输入框在可视区域内
                (loginContainer as HTMLElement).style.height = `${viewportHeight}px`;
                (loginContainer as HTMLElement).style.position = "absolute";
                (loginContainer as HTMLElement).style.top = "0";
                (loginContainer as HTMLElement).style.transform = "none";
                document.body.scrollTop = 0;
            } else {
                // 恢复原始样式
                (loginContainer as HTMLElement).style.height = "100%";
                (loginContainer as HTMLElement).style.position = "fixed";
                (loginContainer as HTMLElement).style.top = "0";
                (loginContainer as HTMLElement).style.transform = "none";
            }
        };
        
        // 添加视口大小改变事件监听
        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", handleVisualViewportResize);
        } else {
            window.addEventListener("resize", handleVisualViewportResize);
        }
        
        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener("resize", handleVisualViewportResize);
            } else {
                window.removeEventListener("resize", handleVisualViewportResize);
            }
        };
    }, [isMobileDevice]);

    const { currentState, setCurrentState, handleLogin, onLoginResult, onBoundPhone } =
        useLoginState();

    // 根据设备类型调整登录按钮数组
    const getLoginButtons = (): LoginButtonProviderType[] => {
        const allButtons = process.env.LOGIN_METHODS.split(",") as LoginButtonProviderType[];
        
        // 在移动设备上可以选择性减少登录方式，简化界面
        if (isMobileDevice) {
            // 这里示例保留最常用的几种登录方式，可根据需求调整
            return allButtons.filter(btn => 
                ["phone", "email", "wechat", "github"].includes(btn)
            );
        }
        
        return allButtons;
    };

    const panel = useMemo(() => {
        // const privacyURL = language.startsWith("zh") ? PRIVACY_URL_CN : PRIVACY_URL;
        // const serviceURL = language.startsWith("zh") ? SERVICE_URL_CN : SERVICE_URL;

        const privacyURL =
            FLAT_REGION === "CN"
                ? language.startsWith("zh")
                    ? PRIVACY_URL_CN_CN
                    : PRIVACY_URL_CN_EN
                : language.startsWith("zh")
                  ? PRIVACY_URL_EN_CN
                  : PRIVACY_URL_EN_EN;
        const serviceURL =
            FLAT_REGION === "CN"
                ? language.startsWith("zh")
                    ? SERVICE_URL_CN_CN
                    : SERVICE_URL_CN_EN
                : language.startsWith("zh")
                  ? SERVICE_URL_EN_CN
                  : SERVICE_URL_EN_EN;
        const emailLanguage = language.startsWith("zh") ? "zh" : "en";

        const loginProps = {
            buttons: getLoginButtons(),
            privacyURL,
            serviceURL,
            onClickButton: handleLogin,
        };

        switch (currentState.value) {
            case "loginWithCode": {
                return (
                    <LoginWithCode
                        {...loginProps}
                        loginOrRegister={async (countryCode, phone, code) =>
                            wrap(loginPhone(countryCode + phone, Number(code)).then(onLoginResult))
                        }
                        loginWithPassword={() => setCurrentState("SWITCH_TO_PASSWORD")}
                        sendVerificationCode={async (countryCode, phone) =>
                            wrap(loginPhoneSendCode(countryCode + phone))
                        }
                    />
                );
            }
            case "register": {
                return (
                    <RegisterModal
                        backToLogin={() => setCurrentState("SWITCH_TO_PASSWORD")}
                        {...loginProps}
                        register={(
                            type: PasswordLoginType,
                            { key, originKey, countryCode }: LoginKeyType,
                            code,
                            password: string,
                        ) =>
                            wrap(
                                type === PasswordLoginType.Email
                                    ? registerEmail(key, Number(code), password).then(() => {
                                          sp(loginEmailWithPwd(key, password)).then(authInfo =>
                                              onLoginResult(authInfo, { key: originKey, password }),
                                          );
                                      })
                                    : registerPhone(key, Number(code), password).then(() => {
                                          sp(loginPhoneWithPwd(key, password)).then(authInfo =>
                                              onLoginResult(authInfo, {
                                                  key: originKey,
                                                  password,
                                                  countryCode,
                                              }),
                                          );
                                      }),
                            )
                        }
                        sendVerificationCode={async (type, key) =>
                            wrap(
                                type === PasswordLoginType.Email
                                    ? registerEmailSendCode(key, emailLanguage)
                                    : registerPhoneSendCode(key),
                            )
                        }
                    />
                );
            }
            case "wechatQRCode": {
                return (
                    <QRCodePanel
                        backToLogin={() => setCurrentState("SWITCH_TO_PASSWORD")}
                        renderQRCode={() => <WeChatLogin onLoginResult={onLoginResult} />}
                    />
                );
            }
            case "bindingPhone": {
                return (
                    <BindingPhonePanel
                        bindingPhone={async (countryCode, phone, code) =>
                            wrap(bindingPhone(countryCode + phone, Number(code)).then(onBoundPhone))
                        }
                        cancelBindingPhone={() => {
                            onLoginResult(null);
                            setCurrentState("SWITCH_TO_PASSWORD");
                        }}
                        needRebindingPhone={phone => {
                            setBindingPhone(phone);
                            setCurrentState("SWITCH_TO_REBINDING_PHONE");
                        }}
                        sendBindingPhoneCode={async (countryCode, phone) =>
                            bindingPhoneSendCode(countryCode + phone)
                        }
                    />
                );
            }
            case "rebindingPhone": {
                return (
                    <RebindingPhonePanel
                        cancelRebindingPhone={() => {
                            setCurrentState("SWITCH_TO_BINDING_PHONE");
                        }}
                        defaultPhone={phone}
                        rebindingPhone={async (countryCode, phone, code) =>
                            wrap(
                                rebindingPhone(countryCode + phone, Number(code)).then(
                                    onLoginResult,
                                ),
                            )
                        }
                        sendRebindingPhoneCode={async (countryCode, phone) =>
                            rebindingPhoneSendCode(countryCode + phone)
                        }
                    />
                );
            }
            default: {
                return (
                    <LoginWithPassword
                        {...loginProps}
                        accountHistory={globalStore.accountHistory}
                        login={async (
                            type,
                            { key, originKey, countryCode }: LoginKeyType,
                            password,
                        ) =>
                            wrap(
                                type === PasswordLoginType.Email
                                    ? loginEmailWithPwd(key, password).then(authInfo =>
                                          onLoginResult(authInfo, { key: originKey, password }),
                                      )
                                    : loginPhoneWithPwd(key, password).then(authInfo =>
                                          onLoginResult(authInfo, {
                                              key: originKey,
                                              password,
                                              countryCode,
                                          }),
                                      ),
                            )
                        }
                        loginWithVerificationCode={() => setCurrentState("SWITCH_TO_CODE")}
                        register={() => setCurrentState("SWITCH_TO_REGISTER")}
                        resetPassword={(
                            type: PasswordLoginType,
                            { key, originKey, countryCode }: LoginKeyType,
                            code: string,
                            password: string,
                        ) =>
                            wrap(
                                type === PasswordLoginType.Email
                                    ? resetPwdWithEmail(key, Number(code), password).then(() => {
                                          sp(loginEmailWithPwd(key, password)).then(authInfo =>
                                              onLoginResult(authInfo, { key: originKey, password }),
                                          );
                                      })
                                    : resetPwdWithPhone(key, Number(code), password).then(() => {
                                          sp(loginPhoneWithPwd(key, password)).then(authInfo =>
                                              onLoginResult(authInfo, {
                                                  key: originKey,
                                                  password,
                                                  countryCode,
                                              }),
                                          );
                                      }),
                            )
                        }
                        sendVerificationCode={async (type, key) =>
                            wrap(
                                type === PasswordLoginType.Email
                                    ? resetEmailSendCode(key, emailLanguage)
                                    : resetPhoneSendCode(key),
                            )
                        }
                    />
                );
            }
        }
    }, [
        language,
        handleLogin,
        currentState.value,
        onLoginResult,
        setCurrentState,
        sp,
        onBoundPhone,
        phone,
        isMobileDevice,
    ]);

    return (
        <div className="login-page-container" style={{ borderRadius: window.isElectron ? 0 : (isMobileDevice ? 0 : 12) }}>
            <LoginPanel>{panel}</LoginPanel>
            <AppUpgradeModal />
        </div>
    );
});

export default LoginPage;
