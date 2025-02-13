import fs from 'fs';
import path from 'path';
import psTree from 'ps-tree';
import { ChildProcess, spawn } from 'child_process';
import { TimeDeltas } from './TimeDeltas';
import { appendToLogFile } from '../utils/appendToLog';

/**
 * v1.0.0
 * Originally created in autoChartGeneration project.
 */
export class AERender {
    outputPath: string;
    command: string;
    execPromiseInstance: Promise<string>;
    childProcess: ChildProcess;

    // Progress tracking properties
    currentFrame: number = 0;
    totalFrames: number = 0;
    progressPercentage: number = 0;
    frameRate: any;
    frameRateAvailable: boolean = false;
    durationAvailable: any;
    durationInFrames: number = 0;
    duration: any;
    durationParsed: any;
    startTime: number = Date.now();
    secondsElapsed: number = 0;
    hasMissingFonts: boolean = false;
    abortLog = {
        code: 0,
        message: `All good.`,
    };

    /**
     * We have three intervals running
     * to determine how much time has passed,
     * what's the render progress and if
     * the progress has been idle for too long
     */
    progressInterval?: NodeJS.Timeout;
    timeoutInterval?: NodeJS.Timeout;
    idleProgressMonitorInterval?: NodeJS.Timeout;

    constructor(
        public TD: TimeDeltas,
        public logFileName: string,
        public aeRenderPath: string,
        public projectFilePath: string,
        public exportFolderPath: string,
        public exportFileName: string,
        public renderCompName: string,
        public timeLimit: number = 120,
        public abortController: AbortController = new AbortController(),
        public startFrame?: number,
        public endFrame?: number
    ) {
        this.validateCriticalPaths();
        this.createExportFolderIfDoesntExist();
        this.outputPath = path.resolve(
            this.exportFolderPath,
            this.exportFileName
        );
        this.command = this.constructCommand();

        const { execPromiseInstance, process } = this.spawnChildProcess();
        this.execPromiseInstance = execPromiseInstance;
        this.childProcess = process;

        this.startProgressTracking();
        this.startTimeoutManagement();
        this.startIdleProgressMonitor();
    }
    /**
     * Validates that all critical file paths exist before starting the rendering process.
     *
     * @throws {string} Throws an error with the invalid path if it does not exist.
     */
    validateCriticalPaths() {
        for (let path of [this.projectFilePath, this.aeRenderPath])
            if (!fs.existsSync(path)) throw `Path doesn't exist: ${path}`;
    }
    /**
     * Ensures the export folder exists.
     * If it doesn't, it creates the folder.
     */
    createExportFolderIfDoesntExist() {
        for (let path of [this.exportFolderPath])
            if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
    }
    /**
     * Constructs the command to execute AERender.
     */
    constructCommand() {
        // Validate essential properties
        if (
            !this.aeRenderPath ||
            !this.projectFilePath ||
            !this.renderCompName ||
            !this.outputPath
        ) {
            throw new Error(
                `Missing required parameters for command construction. Ensure paths and composition name are set.`
            );
        }

        let command = `"${this.aeRenderPath}" -project "${this.projectFilePath}" -comp "${this.renderCompName}" -output "${this.outputPath}"`;
        if (this.startFrame) command += ` -s ${this.startFrame}`;
        if (this.endFrame) command += ` -e ${this.endFrame}`;

        return command;
    }
    /**
     * Spawns the AERender process and tracks its execution.
     *
     * This method initializes a child process to run the `aerender` executable with
     * the constructed command. It captures the standard output and error streams,
     * processes progress information in real time, and provides a promise to handle
     * the process lifecycle.
     *
     * @returns {{ execPromiseInstance: Promise<string>, process: ChildProcess }}
     *          An object containing the execution promise and the spawned child process.
     * @throws {Error} Throws an error if the command is invalid, the process fails to start,
     * or is aborted.
     */
    spawnChildProcess() {
        if (!this.command) {
            throw new Error(
                'Command is empty or invalid. Ensure constructCommand() was executed correctly.'
            );
        }

        const args = this.command.split(' ');
        const executable = args.shift()!;
        const options = { signal: this.abortController.signal };

        let spawnedProcess: ChildProcess;

        const execPromiseInstance = new Promise<string>((resolve, reject) => {
            try {
                spawnedProcess = spawn(executable, args, { shell: true });
            } catch (error) {
                const errorMessage = `Failed to spawn process: ${error}`;
                console.error(errorMessage);
                appendToLogFile(errorMessage, this.logFileName);
                return reject(new Error(errorMessage));
            }

            let stdoutData = '';
            let stderrData = '';

            if (options?.signal) {
                options.signal.addEventListener('abort', () => {
                    const abortMessage = 'Process aborted.';
                    console.warn(abortMessage);
                    this.abortLog = {
                        code: 1,
                        message: abortMessage,
                    };
                    appendToLogFile(abortMessage, this.logFileName);
                    this.killProcessTree(spawnedProcess.pid!);
                    reject(new Error('Process aborted'));
                });
            }

            spawnedProcess.stdout?.on('data', (data) => {
                const output = data.toString();
                /**
                 * Because AERender spams output messages
                 * in this format: "PROGRESS:  0:00:26:22 (647): 0 Seconds"
                 * We'll omit messages that contain five colons,
                 * parentheses and the word "Seconds"
                 */
                const isSpamMessage = (message: string) => {
                    if (!message.includes(':')) return false;
                    const numColons: number = message.split(':').length - 1;
                    return (
                        numColons === 5 &&
                        message.includes('(') &&
                        message.includes(')') &&
                        message.includes('Seconds')
                    );
                };

                if (!isSpamMessage(output)) {
                    const stdOutMessage = `[AE STDOUT] ${output}`;
                    console.log(stdOutMessage);
                    appendToLogFile(stdOutMessage, this.logFileName);
                }

                this.parseProgress(output);
                stdoutData += output;
            });

            spawnedProcess.stderr?.on('data', (data) => {
                const output = data.toString();
                const stdErrMessage = `[AE STDERR] ${output}`;
                console.error(stdErrMessage);
                appendToLogFile(stdErrMessage, this.logFileName);
                stderrData += output;
            });

            spawnedProcess.on('close', (code) => {
                if (code === 0) {
                    const successMessage = 'Process completed successfully.';
                    console.log(successMessage);
                    appendToLogFile(successMessage, this.logFileName);
                    resolve(stdoutData);
                } else {
                    const errorMessage = `CLOSE spawnChildProcess code > 0 --- Process exited with code ${code}. Errors: ${stderrData}`;
                    console.error(errorMessage);
                    appendToLogFile(errorMessage, this.logFileName);
                    reject(new Error(errorMessage));
                }
            });

            spawnedProcess.on('error', (error) => {
                const errorMessage = `Process error: ${error.message}`;
                console.error(errorMessage);
                appendToLogFile(errorMessage, this.logFileName);
                reject(new Error(errorMessage));
            });
        });

        return { execPromiseInstance, process: spawnedProcess! };
    }
    /**
     * Parses progress-related output from AERender.
     *
     * This method processes the standard output from the AERender process to extract
     * and track rendering progress, frame rate, and duration. It dynamically calculates
     * the progress percentage based on the current frame and total frames.
     *
     * @param {string} output - The standard output string from the AERender process.
     * @private
     */
    private parseProgress(output: string) {
        try {
            // Match frame progress like "PROGRESS:  0:00:04:22 (123): ..."
            const frameProgressMatch = output.match(/PROGRESS:\s+.*\((\d+)\):/);
            if (frameProgressMatch) {
                this.currentFrame = parseInt(frameProgressMatch[1], 10);
            }

            // Match frame rate like "Frame Rate: 25.00 (comp)"
            if (!this.frameRateAvailable) {
                const frameRateMatch = output.match(
                    /Frame Rate:\s+([\d.]+)\s*\(comp\)/
                );
                if (frameRateMatch) {
                    this.frameRate = parseFloat(frameRateMatch[1]);
                    this.frameRateAvailable = true;
                    const message = `Parsed Frame Rate: ${this.frameRate}`;
                    appendToLogFile(message, this.logFileName);
                    // console.log(`Parsed Frame Rate: ${this.frameRate}`);
                }
            }

            // Match duration like "Duration: 0:00:24:18"
            if (!this.durationParsed) {
                const durationMatch = output.match(
                    /Duration:\s+(\d+):(\d+):(\d+):(\d+)/
                );
                if (durationMatch) {
                    const [_, hours, minutes, seconds, frames] =
                        durationMatch.map(Number);
                    this.duration = { hours, minutes, seconds, frames };
                    this.durationParsed = true;
                    // console.log(`Parsed Duration: ${JSON.stringify(this.duration)}`);
                    const message = `Parsed Duration: ${JSON.stringify(
                        this.duration
                    )}`;
                    appendToLogFile(message, this.logFileName);
                }
            }

            // Calculate total frames if both duration and frame rate are available
            if (
                this.durationParsed &&
                this.frameRateAvailable &&
                this.totalFrames === 0
            ) {
                this.calculateTotalFrames();
            }

            // Update progress percentage
            if (this.totalFrames > 0 && this.currentFrame > 0) {
                this.progressPercentage = Math.min(
                    100,
                    Math.round((this.currentFrame / this.totalFrames) * 100)
                );
                // console.log(
                //     `Progress: ${this.progressPercentage}% (${this.currentFrame}/${this.totalFrames} frames)`
                // );
                // const message = `Progress: ${this.progressPercentage}% (${this.currentFrame}/${this.totalFrames} frames)`;
                // appendToLogFile(message, this.logFileName);
            }
        } catch (error) {
            const errorMessage = `Error parsing progress: ${error}`;
            console.warn(errorMessage);
            appendToLogFile(errorMessage, this.logFileName);
        }
    }

    private calculateTotalFrames() {
        if (!this.duration || !this.frameRate) return;

        const { hours, minutes, seconds, frames } = this.duration;
        this.totalFrames =
            (hours * 3600 + minutes * 60 + seconds) * this.frameRate + frames;

        console.log(`Calculated Total Frames: ${this.totalFrames}`);
    }
    getProgress() {
        return {
            currentFrame: this.currentFrame,
            totalFrames: this.totalFrames,
            progressPercentage: this.progressPercentage,
        };
    }
    /**
     * Terminates a process and its entire child process tree.
     *
     * This method uses the `ps-tree` library to fetch all child processes
     * spawned by the specified process ID (`pid`). It then iteratively sends
     * a `SIGKILL` signal to each process in the tree, including the root process.
     *
     * @param {number} pid - The process ID (PID) of the root process to terminate.
     * @returns {Promise<void>} Resolves when all processes in the tree are terminated.
     * @throws {Error} Logs and throws an error if the termination fails for any process in the tree.
     * @private
     */
    private async killProcessTree(pid: number): Promise<void> {
        if (!pid || pid <= 0) {
            console.warn('Invalid PID. Cannot terminate process tree.');
            return;
        }

        try {
            const childPIDs = await this.getChildProcesses(pid);
            const allPIDs = [...childPIDs, pid.toString()];

            const errors: string[] = [];
            for (const childPID of allPIDs) {
                try {
                    process.kill(parseInt(childPID), 'SIGKILL');
                    console.log(`Killed PID ${childPID}`);
                } catch (error: any) {
                    if (error.code === 'ESRCH') {
                        console.warn(
                            `PID ${childPID} does not exist (already terminated).`
                        );
                    } else {
                        const errorMessage = `Failed to kill PID ${childPID}: ${error.message}`;
                        console.error(errorMessage);
                        errors.push(errorMessage);
                    }
                }
            }

            if (errors.length > 0) {
                const manyErrors = errors.join('\n');
                throw new Error(manyErrors);
            }
        } catch (error) {
            const errorMessage = `Failed to terminate process tree: ${error}`;
            console.error(errorMessage);
            appendToLogFile(errorMessage, this.logFileName);
        }
    }
    /**
     * Fetches the child processes of a given PID using `ps-tree`.
     *
     * @param {number} pid - The process ID (PID) of the root process.
     * @returns {Promise<string[]>} A promise that resolves to an array of child process IDs.
     * @private
     */
    private getChildProcesses(pid: number): Promise<string[]> {
        return new Promise((resolve, reject) => {
            psTree(pid, (err, children) => {
                if (err) {
                    return reject(err);
                }
                resolve(children.map((child) => child.PID));
            });
        });
    }
    /**
     * Track progress.
     * When the process is complete, the interval is cleared.
     */
    private startProgressTracking(progressInterval: number = 15) {
        this.progressInterval = setInterval(() => {
            const message = `Current Progress: ${this.progressPercentage}%`;
            console.log(message);
            appendToLogFile(message, this.logFileName);
            if (this.progressPercentage >= 100) this.clearIntervals();
        }, progressInterval * 1000);
    }
    /**
     * Track time limit.
     * We'll be counting every second to keep track
     * of time control, but logging the time
     * every @param logInterval seconds (20)
     */
    private startTimeoutManagement(logInterval: number = 20) {
        this.timeoutInterval = setInterval(() => {
            this.secondsElapsed = Math.floor(
                (Date.now() - this.startTime) / 1000
            );
            if (this.secondsElapsed >= this.timeLimit) {
                const timeoutMessage = `Timeout reached. Aborting process...`;
                console.error(timeoutMessage);
                // this.logMessage(timeoutMessage);
                appendToLogFile(timeoutMessage, this.logFileName);
                this.abortController.abort();
                this.clearIntervals();
            }

            // log every 20 seconds
            if (this.secondsElapsed % logInterval === 0) {
                const message = `${this.secondsElapsed} seconds have elapsed.`;
                console.warn(message);
                // this.logMessage(message);
                appendToLogFile(message, this.logFileName);
            }
        }, 1000);
    }
    /**
     * If @param this.progressPercentage hasn't changed
     * in the last @param allowedIdleSeconds (100) seconds
     * abort the process.
     */
    private startIdleProgressMonitor(allowedIdleSeconds: number = 100) {
        let lastCheckup = 0;

        this.idleProgressMonitorInterval = setInterval(() => {
            /**
             * we want this interval to start at 100 seconds
             * so we make sure no idle check is done before 90 seconds
             */

            if (this.secondsElapsed > allowedIdleSeconds * 0.9) {
                console.log(
                    `%cIdle check:\nLastCheckup: ${lastCheckup}\nthis.progressPercentage: ${this.progressPercentage}`,
                    'color: orange'
                );

                if (this.progressPercentage === lastCheckup) {
                    const idleProgressErrorMessage = `Progress has remained: ${this.progressPercentage} at least ${allowedIdleSeconds} seconds. Aborting process...`;
                    console.error(idleProgressErrorMessage);
                    // this.logMessage(timeoutMessage);
                    appendToLogFile(idleProgressErrorMessage, this.logFileName);
                    this.abortController.abort();
                    this.clearIntervals();
                }

                // If all's is good, let's update the last checkup
                lastCheckup = this.progressPercentage;
            }
        }, allowedIdleSeconds * 1000);
    }
    private clearIntervals() {
        if (this.progressInterval) clearInterval(this.progressInterval);
        if (this.timeoutInterval) clearInterval(this.timeoutInterval);
        if (this.idleProgressMonitorInterval)
            clearInterval(this.idleProgressMonitorInterval);
    }
}
