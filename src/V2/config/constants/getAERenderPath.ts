import os from 'os';

export function getAERenderPath(aeVersion: number = 23) {
    /**
     * Let's first determine the os
     */
    const platform = os.platform();
    if (platform === 'win32') {
        return `C:/Program Files/Adobe/Adobe After Effects 20${aeVersion}/Support Files/aerender.exe`;
    } else {
        throw `Unsupported OS ${platform}`;
    }
}
