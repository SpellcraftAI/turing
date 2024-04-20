import automaton, { type TapeValue } from "./eval";

const four = Array.from<TapeValue>({ length: 4 }).fill(0)
const eleven = Array.from<TapeValue>({ length: 11 }).fill(0)
const twelve = Array.from<TapeValue>({ length: 12 }).fill(0)
const sixteen = Array.from<TapeValue>({ length: 16 }).fill(0)
const twentyFour = Array.from<TapeValue>({ length: 24 }).fill(0)

four[2] = 1
eleven[9] = 1;
twelve[8] = 1;
sixteen[4] = 1;
twentyFour[11] = 1;
// twentyFour[0] = 1;


// automaton(sixteen, 30, 16);
// sixteen[9] = 1;

automaton(twelve, 90, 20);
twelve[0] = 1;
automaton(twelve, 54, 12);

automaton(eleven, 150, 16);
eleven[2] = 1;
automaton(eleven, 60, 20);

automaton(four, 90, 6)
automaton(four, 28, 6)
automaton(four, 60, 6)
automaton(four, 50, 6)
// automaton(four, 235, 12)
automaton(four, 30, 6)
// automaton(seven, 210, 15)
// automaton(seven, 67, 15)
four[0] = 1;
automaton(four, 31, 6);
automaton(four, 26, 6);
automaton(four, 31, 2);
automaton(four, 31, 3);

// automaton(sixteen, 19, 20);
// automaton(twentyFour, 10);