import {LineProcessor} from "./base/lineprocessor"
import {BaseLineProcessor, BaseResult} from "./base/baselineprocessor"
import {JdbState} from "../jdb"

export interface StopAtResult extends BaseResult {

}

export class StopAtLineProcessor extends BaseLineProcessor implements LineProcessor<StopAtResult> {

    process(line: string) {
        try {
            let [_, className, lineNr, reason] = line.match(/Unable to set breakpoint (\w+?):(\d+) : (.+)$/)
            this.setBreakpoint(className, +lineNr, false);
        } catch(e) {}

        try {
            let [_, className, lineNr] = line.match(/Set breakpoint (\w+?):(\d+)/)
            this.setBreakpoint(className, +lineNr, true);
        } catch(e) {}

        try {
            let [_, className, lineNr] = line.match(/Deferring breakpoint (\w+?):(\d+)/)
            this.setBreakpoint(className, +lineNr, false);
        } catch(e) {}
        
    }
}