import {LineProcessor} from "./base/lineprocessor"
import {MovingLineProcessor, MovingResult} from "./base/movinglineprocessor"
import {JdbState, JdbRunningState} from "../jdb"

export interface ContResult extends MovingResult {
    breakpointHit: boolean;
    applicationExited: boolean;
}

export class ContLineProcessor extends MovingLineProcessor implements LineProcessor<ContResult> {

    private breakpointHit = false;
    private applicationExited = false;

    public result(): ContResult {
        let assign = Object["assign"].bind(Object);
        return assign({}, super.result(), {
            breakpointHit: this.breakpointHit,
            applicationExited: this.applicationExited
        });
    }

    process(line: string) {
        try {
            let [_, currentClass, currentLine] = line.match(/Breakpoint hit.*?, (\w+).*?line=(\d+)/);
            this.breakpointHit = true;
        } catch(e) {/*do nothing - the given line was just not the one...*/}

        try {
            let [_, currentClass, currentLine] = line.match(/The application exited/);
            this.applicationExited = true;
        } catch(e) {/*do nothing - the given line was just not the one...*/}
    }
}