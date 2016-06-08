import {spawn, SpawnOptions, ChildProcess} from "child_process"
import {createInterface, ReadLine} from "readline"

export interface LaunchOptions {
    workingDir?: string
}

interface LineProcessResult {
    stop: boolean;
    state: JdbState
}

interface LineProcessor {
    process(line: string, JdbState): LineProcessResult;
}

interface JdbState {
    currentClass?: string,
    currentLine?: number
}

export class Jdb {

    private jdb: ChildProcess;
    private reader: ReadLine;
    private processor: LineProcessor;
    private readingFinish: Function;
    private stdoutReady = false;
    private state: JdbState = {};

    public launch(mainClass: string, options?: LaunchOptions): void {

        this.state.currentClass = mainClass;
        this.state.currentLine = 1;

        let jdbOptions = ["-launch", mainClass];
        let spawnOptions: SpawnOptions = {};
        if(options) {
            if(options.workingDir) {
                spawnOptions.cwd = options.workingDir
            }
        }

        this.jdb = spawn("jdb", jdbOptions, spawnOptions);
        this.reader = createInterface({input: this.jdb.stdout});
        this.initReaderListeners();

        this.write("\n");
    }

    private initReaderListeners(): void {
        this.reader.on("line", this.onLine.bind(this));
    }

    protected onLine(line: string): void {
        //process.stdout.write(`jdb: ${line}\n`);

        if(!this.stdoutReady) {
            if(!line || !line.length) {
                this.stdoutReady = true;
            }
            return;
        }
        
        let result = this.processor ? this.processor.process(line, this.state): void 0;
        if(result) {
            this.state = result.state;
            if(result.stop) {
                this.processor = void 0;
                this.readingFinish && this.readingFinish();
            }
        }

    }

    private write(data: string): void {
        this.jdb.stdin.write(data);
    }

    public step(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.processor = new StepLineProcessor(this);
            this.readingFinish = () => {
                process.stdout.write(`>>> Finished reading lines after step command\n>>>Current class: ${this.state.currentClass} : Current Line: ${this.state.currentLine}\n\n`);
                resolve();
            };
            this.write("step\n");
        });
    }

}

class StepLineProcessor implements LineProcessor {

    constructor(private jdb: Jdb) {}

    process(line: string, state: JdbState): LineProcessResult {
        let stop = false;
        
        try {
            let [_, currentClass, currentLine] = line.match(/.*?, (\w+).*?line=(\d+)/);
            state.currentClass = currentClass;
            state.currentLine = +currentLine;
        } catch(e) {/*do nothing - the given line was just not the one...*/}
        
        if(!line || !line.length) {
            stop = true;
        }
        
        return {stop, state}
    }
}