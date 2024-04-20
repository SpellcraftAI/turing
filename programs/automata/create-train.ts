import automaton, { type TapeValue } from "./eval";

const five = Array.from<TapeValue>({ length: 5 }).fill(0)
const eleven = Array.from<TapeValue>({ length: 11 }).fill(0)
const twelve = Array.from<TapeValue>({ length: 12 }).fill(0)
const sixteen = Array.from<TapeValue>({ length: 16 }).fill(0)
const twentyFour = Array.from<TapeValue>({ length: 24 }).fill(0)

five[3] = 1
eleven[9] = 1;
twelve[8] = 1;
sixteen[4] = 1;
twentyFour[11] = 1;
// twentyFour[0] = 1;

automaton(five, 13, 9)
automaton(five, 8, 9)
automaton(five, 7, 9)
automaton(five, 31, 12);
five[1] = 1;
automaton(five, 31, 12);

automaton(eleven, 13, 16);
eleven[2] = 1;
automaton(eleven, 13, 20);

automaton(twelve, 110, 14);
twelve[11] = 1;
automaton(twelve, 110, 12);

automaton(sixteen, 19, 16);
sixteen[9] = 1;
automaton(sixteen, 19, 20);
// automaton(twentyFour, 5);