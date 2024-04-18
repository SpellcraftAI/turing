import automaton, { type TapeValue } from "./eval";

const ten = Array.from<TapeValue>({ length: 10 }).fill(0)
const twelve = Array.from<TapeValue>({ length: 12 }).fill(0)
const sixteen = Array.from<TapeValue>({ length: 16 }).fill(0)
const twentyFour = Array.from<TapeValue>({ length: 24 }).fill(0)

ten[9] = 1;
twelve[8] = 1;
twelve[11] = 1;
sixteen[4] = 1;
sixteen[9] = 1;
// twentyFour[2] = 1;
twentyFour[11] = 1;
// twentyFour[0] = 1;

automaton(twelve, 110, 12);
automaton(sixteen, 110, 16);
automaton(twentyFour, 5, 24);