import {LineProcessResult} from "./base/lineprocessor"
import {MovingLineProcessor} from "./base/movinglineprocessor"
import {JdbState, JdbRunningState} from "../jdb"

export class ContLineProcessor extends MovingLineProcessor {

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