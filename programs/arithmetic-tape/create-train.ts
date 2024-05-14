import { clearTrainingTape, addToTrainingTape, toPositionalBinaries } from "../utils"
import multiply from "./eval"

clearTrainingTape()

const training = [
  [7_954_114_363, 9_999_999_999],
  // [999_999_937, 780_291_637],
  // [10_000_019, 15_485_863],
  // [1_000_003, 1_299_709],
  // [102_059, 129_334],
  // [102_069, 462_121],
  // [99_991, 99_144],
  // [89_736, 72_398],
  // [2059, 1029],
  // [3059, 9763],
  // [219, 129],
  [75, 75],
  [11, 20],
  [4, 3],
  [9, 83],
  [12, 98],
  // [12, 123],
  // [16, 15],
  // [24, 162],
  // [32, 31],
  // [64, 235],
  [49, 302],
  [29, 12],
  [96, 213]
]

const binarySets = training.map(toPositionalBinaries)

for (const binaries of binarySets) {
  addToTrainingTape(multiply, ...binaries)
}