import {LineProcessResult} from "./base/lineprocessor"
import {BaseLineProcessor} from "./base/baselineprocessor"
import {JdbState} from "../jdb"

export class WhereLineProcessor extends BaseLineProcessor {

    process(line: string, _state: JdbState): LineProcessResult {
        let {stop, state} = super.process(line, _state);

        try {
             let [_, nr, className, methodName, fileName, lineNr] = line.match(/\[(\d+)\] ([\w.]+)\.([\w<>]+) \((.*):(\d+)\)/)
             state.frames.push({
                 nr: +nr, className, methodName, fileName, lineNr: +lineNr
             })
         } catch(e) {}

        return {stop, state};
    }
}