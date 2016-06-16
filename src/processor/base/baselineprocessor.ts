import {LineProcessor, LineProcessResult} from "./lineprocessor"
import {JdbState} from "../../jdb"

export class BaseLineProcessor implements LineProcessor {

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
        //return !line || !line.length;
        //return line.indexOf(`"STOP" = "STOP"`) > -1;
        return !!line.match(/^[\s>]+$/);
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