import {LineProcessor} from "./base/lineprocessor"
import {BaseLineProcessor, BaseResult} from "./base/baselineprocessor"
import {JdbState} from "../jdb"

export interface Frame {
    nr: number;
    className: string;
    methodName: string;
    fileName: string;
    lineNr: number;
}

export interface WhereResult extends BaseResult {
    frames: Array<Frame>;
}

export class WhereLineProcessor extends BaseLineProcessor implements LineProcessor<WhereResult> {

    protected frames = new Array<Frame>();

    public result(): WhereResult {
        let assign = Object["assign"].bind(Object);
        return assign({}, super.result(), {
            frames: this.frames
        });
    }

    process(line: string) {
        try {
             let [_, nr, className, methodName, fileName, lineNr] = line.match(/\[(\d+)\] ([\w.]+)\.([\w<>]+) \((.*):(\d+)\)/)
             this.frames.push({
                 nr: +nr, className, methodName, fileName, lineNr: +lineNr
             })
         } catch(e) {}
    }
}