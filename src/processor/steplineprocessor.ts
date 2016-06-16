import {LineProcessResult} from "./base/lineprocessor"
import {MovingLineProcessor} from "./base/movinglineprocessor"
import {JdbState} from "../jdb"

export class StepLineProcessor extends MovingLineProcessor {

    process(line: string, _state: JdbState): LineProcessResult {
        let {stop, state} = super.process(line, _state);
        
        try {
            let [_, currentClass, currentLine] = line.match(/.*?, (\w+).*?line=(\d+)/);
            state.currentClass = currentClass;
            state.currentLine = +currentLine;
        } catch(e) {/*do nothing - the given line was just not the one...*/}
        
        
        return {stop, state}
    }
}