import {spawn, SpawnOptions, ChildProcess} from "child_process"
import {createInterface, ReadLine} from "readline"
import {LineProcessor, BaseLineProcessor, StopAtLineProcessor, StopAtResult, StepLineProcessor, StepResult, ContLineProcessor, ContResult, WhereLineProcessor, WhereResult} from "./processor"

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

export interface JdbStackFrame {
    nr: number;
    className: string;
    methodName: string;
    fileName: string;
    lineNr: number;
}

export interface JdbFramesState  extends Array<JdbStackFrame> {}

export interface JdbState {
    currentClass?: string;
    currentLine?: number;
    breakpoints?: JdbStateBreakpoints;
    running?: JdbRunningState;
    frames?: JdbFramesState;
}

export class Jdb {

    private jdb: ChildProcess;
    private data: string;
    private processor: LineProcessor<any>;
    private readingFinish: Function;
    private stdoutReady = false;
    private state: JdbState = {};
    private _terminated = false;

    public launch(mainClass: string, options?: LaunchOptions): Promise<void> {

        this.state.currentClass = mainClass;
        this.state.currentLine = 1;

        let jdbOptions = [];
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

        jdbOptions.push("-launch", mainClass);

        this.jdb = spawn("jdb", jdbOptions, spawnOptions);
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

        private get commandCompleted(): boolean {
        return !!this.data.match(/\w+\[\d+\] $/) || !!this.data.match(/\r?\nThe application exited\r?\n/);
    }

    private initReaderListeners(): void {
        this.jdb.stdout.on("data", (data:Buffer) => {
            this.data += data.toString("utf-8");
            if(this.commandCompleted) {
                let lines = this.data.split(/\n\r?/);
                lines.forEach(this.onLine.bind(this));
                this.processor = void 0;
                this.readingFinish && this.readingFinish();
            } 
        });
    }

    public getState(): JdbState {
        return this.state;
    }

    protected onLine(line: string): void {
        this.processor && this.processor.process(line);
    }

    private write(data: string): void {
        this.data = "";
        this.jdb.stdin.write(data);
    }

    /**************************************************************
     *                      COMMANDS
     *************************************************************/

    public stopAt(className: string, line: number): Promise<StopAtResult> {
        return new Promise<StopAtResult>((resolve, reject) => {
            this.readingFinish = () => {
                resolve(processor.result());
            };
            let processor = this.processor = new StopAtLineProcessor();
            this.write(`stop at ${className}:${line}\n`);
        });
    }

    public step(): Promise<StepResult> {
        return new Promise<StepResult>((resolve, reject) => {
            this.readingFinish = () => {
                resolve(processor.result());
            };
            let processor = this.processor = new StepLineProcessor();
            this.write("step\n");
        });
    }

    public stepI(): Promise<StepResult> {
        return new Promise<StepResult>((resolve, reject) => {
            this.readingFinish = () => {
                resolve(processor.result());
            };
            let processor = this.processor = new StepLineProcessor();
            this.write("stepi\n");
        });
    }

    public stepUp(): Promise<StepResult> {
        return new Promise<StepResult>((resolve, reject) => {
            this.readingFinish = () => {
                resolve(processor.result());
            };
            let processor = this.processor = new StepLineProcessor();
            this.write("step up\n");
        });
    }

    public next(): Promise<StepResult> {
        return new Promise<StepResult>((resolve, reject) => {
            this.readingFinish = () => {
                resolve(processor.result());
            };
            let processor = this.processor = new StepLineProcessor();
            this.write("next\n");
        });
    }

    public cont(): Promise<ContResult> {
        return new Promise<ContResult>((resolve, reject) => {
            this.readingFinish = () => {
                resolve(processor.result());
            };
            let processor = this.processor = new ContLineProcessor();
            this.write(`cont\n`);
        });
    }

    public where(threadId: number = 1): Promise<WhereResult> {
        return new Promise<WhereResult>((resolve, reject) => {
            this.readingFinish = () => {
                resolve(processor.result());
            };
            let processor = this.processor = new WhereLineProcessor();
            this.write(`where ${threadId}\n`);
        });
    }

}