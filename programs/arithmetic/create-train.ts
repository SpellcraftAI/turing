import { clearTrainingTape, addToTrainingTape } from "../utils"
import multiply from "./eval"

clearTrainingTape()

addToTrainingTape(multiply, 12451, 1215)
addToTrainingTape(multiply, 11, 20)
addToTrainingTape(multiply, 4, 3)
addToTrainingTape(multiply, 12, 12)
addToTrainingTape(multiply, 16, 15)
addToTrainingTape(multiply, 24, 16)
addToTrainingTape(multiply, 32, 31)
addToTrainingTape(multiply, 64, 63)