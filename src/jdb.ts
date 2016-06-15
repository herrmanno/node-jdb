import {spawn, SpawnOptions, ChildProcess} from "child_process"
import {createInterface, ReadLine} from "readline"
import {LineProcessor, BaseLineProcessor, StopAtLineProcessor, StepLineProcessor, ContLineProcessor, WhereLineProcessor} from "./processor"

export interface LaunchOptions {
    workingDir?: string;
    classPath?: string;
}

export enum JdbRunningState {
    BREAKPOINT_HIT,
    TERMINATED,
    CAUGHT_EXCEPTION,
    UNCAUGHT_EXCEPTION
}

export interface JdbStateBreakpoints {
    [className: string]: {
        [lineNr: number]: {
            valid: boolean;
            reason?: string;
        }
    }
}

export interface JdbState {
    currentClass?: string;
    currentLine?: number;
    breakpoints?: JdbStateBreakpoints;
    running?: JdbRunningState
}

export class Jdb {

    private jdb: ChildProcess;
    private reader: ReadLine;
    private processor: LineProcessor;
    private readingFinish: Function;
    private stdoutReady = false;
    private state: JdbState = {};
    private _terminated = false;

    public launch(mainClass: string, options?: LaunchOptions): Promise<void> {

        this.state.currentClass = mainClass;
        this.state.currentLine = 1;

        let jdbOptions = ["-launch", mainClass];
        let spawnOptions: SpawnOptions = {};
        if(options) {
            if(options.workingDir) {
                spawnOptions.cwd = options.workingDir
            }
            if(options.classPath) {
                jdbOptions.push("-classpath");
                jdbOptions.push(options.classPath);
            }
        }

        this.jdb = spawn("jdb", jdbOptions, spawnOptions);
        this.reader = createInterface({input: this.jdb.stdout});
        this.initReaderListeners();

        return this.getReady();
    }

    private getReady(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.readingFinish = () => {
                resolve();
            };
            this.processor = new BaseLineProcessor();
            this.write("\n\n");
        });
    }

    public get terminated(): boolean {
        return this._terminated
    }

    private terminate(): void {
        this._terminated = true;
        this.reader.removeAllListeners("line");
    }

    private initReaderListeners(): void {
        this.reader.on("line", this.onLine.bind(this));
    }

    public getState(): JdbState {
        return this.state;
    }

    protected onLine(line: string): void {

        let result = this.processor ? this.processor.process(line, this.state): void 0;
        if(result) {
            this.state = result.state;
            if(result.stop) {
                this.processor = void 0;
                this.readingFinish && this.readingFinish();
            }
            if(result.state.running === JdbRunningState.TERMINATED) {
                this.terminate();
            }
        }

    }

    private write(data: string): void {
        this.jdb.stdin.write(data);
    }

    /**************************************************************
     *                      COMMANDS
     *************************************************************/

    public stopAt(className: string, line: number): Promise<any> {
        return new Promise((resolve, reject) => {
            this.readingFinish = () => {
                resolve();
            };
            this.processor = new StopAtLineProcessor();
            this.write(`stop at ${className}:${line}\n`);
        });
    }

    public step(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.readingFinish = () => {
                resolve();
            };
            this.processor = new StepLineProcessor();
            this.write("step\n");
        });
    }

    public cont(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.readingFinish = () => {
                resolve();
            };
            this.processor = new ContLineProcessor();
            this.write(`cont\n`);
        });
    }

    public where(threadId: number = 1): Promise<any> {
        return new Promise((resolve, reject) => {
            this.readingFinish = () => {
                resolve();
            };
            this.processor = new WhereLineProcessor();
            this.write(`where ${threadId}\n`);
        });
    }

}