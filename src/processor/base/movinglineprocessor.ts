import {LineProcessor} from "./lineprocessor"
import {BaseLineProcessor, BaseResult} from "./baselineprocessor"
import {JdbState, JdbRunningState} from "../../jdb"

export interface MovingResult extends BaseResult {
    caughtException: boolean;
    uncaughtException: boolean;
}

export class MovingLineProcessor extends BaseLineProcessor implements LineProcessor<MovingResult> {

    protected caughtException = false;
    protected uncaughtException = false;

    public result(): MovingResult {
        let assign = Object["assign"].bind(Object);
        return assign({}, super.result(), {
            caughtException: this.caughtException,
            uncaughtException: this.uncaughtException,
        });
    }

    process(line: string) {
        try {
            let [_, exceptionClass, caught, className, lineNr] = line.match(/Exception occurred: ([\w\.]+) \((\w+)\).*?, (\w+).*? line=(\d+)/);
            switch (caught.toUpperCase()) {
                case "CAUGHT":
                    this.caughtException = true;
                    break;
                case "UNCAUGHT":
                    this.uncaughtException = true;
                    break;
                default:
                    break;
            }
        } catch(e) {}
    }
}