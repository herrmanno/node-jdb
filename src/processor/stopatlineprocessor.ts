import {LineProcessResult} from "./base/lineprocessor"
import {BaseLineProcessor} from "./base/baselineprocessor"
import {JdbState} from "../jdb"

export class StopAtLineProcessor extends BaseLineProcessor {

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