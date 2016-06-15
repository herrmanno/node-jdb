import {LineProcessResult} from "./base/lineprocessor"
import {BaseLineProcessor} from "./base/baselineprocessor"
import {JdbState} from "../jdb"

export class WhereLineProcessor extends BaseLineProcessor {

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