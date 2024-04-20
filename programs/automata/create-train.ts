import automaton, { type TapeValue } from "./eval";

const seven = Array.from<TapeValue>({ length: 7 }).fill(0)
const eleven = Array.from<TapeValue>({ length: 11 }).fill(0)
const twelve = Array.from<TapeValue>({ length: 12 }).fill(0)
const sixteen = Array.from<TapeValue>({ length: 16 }).fill(0)
const twentyFour = Array.from<TapeValue>({ length: 24 }).fill(0)

seven[3] = 1
eleven[9] = 1;
twelve[8] = 1;
sixteen[4] = 1;
twentyFour[11] = 1;
// twentyFour[0] = 1;

automaton(seven, 13, 12)
automaton(seven, 8, 12)
automaton(seven, 160, 12)
automaton(seven, 190, 12)
automaton(seven, 235, 12)
automaton(seven, 200, 12)
automaton(seven, 210, 15)
automaton(seven, 67, 15)
automaton(seven, 31, 12);
seven[1] = 1;
automaton(seven, 31, 12);

automaton(eleven, 13, 16);
eleven[2] = 1;
automaton(eleven, 127, 20);

automaton(twelve, 110, 36);
twelve[11] = 1;
automaton(twelve, 26, 12);

automaton(sixteen, 192, 16);
sixteen[9] = 1;
// automaton(sixteen, 19, 20);
// automaton(twentyFour, 10);