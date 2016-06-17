import {LineProcessor} from "./base/lineprocessor"
import {MovingLineProcessor, MovingResult} from "./base/movinglineprocessor"
import {JdbState} from "../jdb"

export interface StepResult extends MovingResult {
    stepCompleted: boolean;
}

export class StepLineProcessor extends MovingLineProcessor implements LineProcessor<StepResult> {

    public result(): StepResult {
        let assign = Object["assign"].bind(Object);
        return assign({}, super.result(), {
            stepCompleted: this.stepCompleted
        });
    }

    protected stepCompleted = false;

    process(line: string) {
        try {
            let [_, currentClass, currentLine] = line.match(/^Step completed/);
            this.stepCompleted = true;
        } catch(e) {/*do nothing - the given line was just not the one...*/}
    }
}