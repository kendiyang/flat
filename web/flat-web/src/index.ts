import "./index.less";

// 添加 crypto.randomUUID polyfill
if (!crypto.randomUUID) {
    const getRandomValues = crypto.getRandomValues.bind(crypto);
    // @ts-ignore 忽略类型检查，因为我们知道返回格式是正确的UUID格式
    crypto.randomUUID = function randomUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = getRandomValues(new Uint8Array(1))[0] % 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
}

import { tasks } from "./tasks";

void (async () => {
    for (const task of tasks) {
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await task();
    }
})();
