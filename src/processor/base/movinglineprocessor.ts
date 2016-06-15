import {LineProcessResult} from "./lineprocessor"
import {BaseLineProcessor} from "./baselineprocessor"
import {JdbState, JdbRunningState} from "../../jdb"

export class MovingLineProcessor extends BaseLineProcessor {

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