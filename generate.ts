import rule_110, { TapeValue } from "./programs/rule110/eval";

// rule_110(
//   [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0], 
//   12
// );

const ten = Array.from<TapeValue>({ length: 10 }).fill(0)
const twelve = Array.from<TapeValue>({ length: 12 }).fill(0)
const sixteen = Array.from<TapeValue>({ length: 16 }).fill(0)
const twentyFour = Array.from<TapeValue>({ length: 24 }).fill(0)

ten[9] = 1;
twelve[8] = 1;
twelve[11] = 1;
sixteen[4] = 1;
sixteen[9] = 1;
twentyFour[2] = 1;
twentyFour[10] = 1;
twentyFour[22] = 1;

rule_110(twelve, 12);
rule_110(sixteen, 16);
rule_110(twentyFour, 24);

// rule_110(ten, 12);

// rule_110([10], 12, 12)