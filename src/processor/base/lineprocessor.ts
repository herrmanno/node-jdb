import {JdbState} from "../../jdb"

export interface LineProcessResult {
    stop: boolean;
    state: JdbState
}

export interface LineProcessor {
    process(line: string, JdbState): LineProcessResult;
}