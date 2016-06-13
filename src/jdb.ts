import {spawn, SpawnOptions, ChildProcess} from "child_process"
import {createInterface, ReadLine} from "readline"

export interface LaunchOptions {
    workingDir?: string;
    classPath?: string;
}

interface LineProcessResult {
    stop: boolean;
    state: JdbState
}

interface LineProcessor {
    process(line: string, JdbState): LineProcessResult;
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

    public launch(mainClass: string, options?: LaunchOptions): Promise<any> {

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

    private getReady(): Promise<any> {
        return new Promise((resolve, reject) => {
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

class BaseLineProcessor implements LineProcessor {

    protected setBreakpoint(state: JdbState, className: string, lineNr: number|string, data: {valid?: boolean, reason?: string}): void {
        state.breakpoints = state.breakpoints || {};
        state.breakpoints[className] = state.breakpoints[className] || {};
        state.breakpoints[className][lineNr+""] = state.breakpoints[className][lineNr+""] || {};
        
        if((<Object>data).hasOwnProperty("valid")) {
            state.breakpoints[className][lineNr+""].valid = data.valid;
        }
        if((<Object>data).hasOwnProperty("reason")) {
            state.breakpoints[className][lineNr+""].valid = data.reason;
        }
    }

    protected willStop(line: string): boolean {
        return !line || !line.length;
    }

    process(line: string, state: JdbState): LineProcessResult {
        let stop = this.willStop(line);

        try {
            let [_, className, lineNr, reason] = line.match(/Unable to set deferred breakpoint (\w+):(\d+) : (.+)$/)
            this.setBreakpoint(state, className, lineNr, {valid: false, reason});
        } catch(e) {}

        try {
            let [_, className, lineNr] = line.match(/Set deferred breakpoint (\w+?):(\d+?)/)
            this.setBreakpoint(state, className, lineNr, {valid: false});

        } catch(e) {}
        
        return {stop, state}
    }
}

class MovingLineProcessor extends BaseLineProcessor {

    protected exceptionOccured = false;

    process(line: string, _state: JdbState): LineProcessResult {
        let {stop, state} = super.process(line, _state);

        try {
            let [_, className, lineNr, reason] = line.match(/Unable to set deferred breakpoint (\w+):(\d+) : (.+)$/)
            this.setBreakpoint(state, className, lineNr, {valid: false, reason});
        } catch(e) {}

        try {
            let [_, className, lineNr] = line.match(/Set deferred breakpoint (\w+?):(\d+?)/)
            this.setBreakpoint(state, className, lineNr, {valid: false});

        } catch(e) {}

        try {
            let [_, exceptionClass, caught, className, lineNr] = line.match(/Exception occurred: ([\w\.]+) \((\w+)\).*?, (\w+).*? line=(\d+)/);
            state.currentClass = className;
            state.currentLine = +lineNr;
            state.running = caught ? JdbRunningState.CAUGHT_EXCEPTION : JdbRunningState.UNCAUGHT_EXCEPTION

            this.exceptionOccured = true;
        } catch(e) {}
        
        return {stop, state}
    }
}

class StopAtLineProcessor extends BaseLineProcessor {

    protected willStop(line: string): boolean {
        return super.willStop(line) || !!line.match(/It will be set after the class is loaded/);
    }

    process(line: string, _state: JdbState): LineProcessResult {
        let {stop, state} = super.process(line, _state);

        try {
            let [_, className, lineNr, reason] = line.match(/Unable to set breakpoint (\w+?):(\d+) : (.+)$/)
            this.setBreakpoint(state, className, lineNr, {valid: false, reason})

            stop = true;
        } catch(e) {}

        try {
            let [_, className, lineNr] = line.match(/Set breakpoint (\w+?):(\d+)/)
            this.setBreakpoint(state, className, lineNr, {valid: true})
            stop = true;

        } catch(e) {}

        try {
            let [_, className, lineNr] = line.match(/Deferring breakpoint (\w+?):(\d+)/)
            this.setBreakpoint(state, className, lineNr, {valid: false})

        } catch(e) {}
        
        return {stop, state};
    }
}

class StepLineProcessor extends MovingLineProcessor {

    protected willStop(line: string): boolean {
        return super.willStop(line);
    }

    process(line: string, _state: JdbState): LineProcessResult {
        let {stop, state} = super.process(line, _state);
        
        try {
            let [_, currentClass, currentLine] = line.match(/.*?, (\w+).*?line=(\d+)/);
            state.currentClass = currentClass;
            state.currentLine = +currentLine;
        } catch(e) {/*do nothing - the given line was just not the one...*/}
        
        
        return {stop, state}
    }
}

class ContLineProcessor extends MovingLineProcessor {

    private breakpointHit = false;

    protected willStop(line: string): boolean {
        return super.willStop(line) && (this.breakpointHit || this.exceptionOccured);
    }

    process(line: string, _state: JdbState): LineProcessResult {
        let {stop, state} = super.process(line, _state);
        
        try {
            let [_, currentClass, currentLine] = line.match(/Breakpoint hit.*?, (\w+).*?line=(\d+)/);
            state.currentClass = currentClass;
            state.currentLine = +currentLine;
            state.running = JdbRunningState.BREAKPOINT_HIT;

            this.breakpointHit = true;
        } catch(e) {/*do nothing - the given line was just not the one...*/}

        try {
            let [_, currentClass, currentLine] = line.match(/The application exited/);
            state.currentClass = null;
            state.currentLine = null;
            state.running = JdbRunningState.TERMINATED;

            stop = true;
        } catch(e) {/*do nothing - the given line was just not the one...*/}
        
        
        return {stop, state}
    }
}

class WhereLineProcessor extends BaseLineProcessor {

    protected willStop(line: string): boolean {
        return super.willStop(line);
    }

    process(line: string, _state: JdbState): LineProcessResult {
        let {stop, state} = super.process(line, _state);

        try {
            let [_] = line.match(/^\w+?\[\d+\].*/)
            stop = true;
        } catch(e) {}

        return {stop, state};
    }
}