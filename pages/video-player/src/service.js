import { prepareRunChecker } from '../../../lib/shared/utils.js'

const { shouldRun } = prepareRunChecker({ timerDelay: 500 })
const EAR_THRESHOLD = 0.27

export default class Service {
  #model = null
  #faceLandmarksDetection
  constructor({ faceLandmarksDetection }) {
    this.#faceLandmarksDetection = faceLandmarksDetection
  }

  async loadModel() {
    this.#model = await this.#faceLandmarksDetection.load(
      this.#faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
      { maxFaces: 1 }
    )
  }
  
  // EAR: Eye Aspect Ratio
  #getEAR(upper, lower) {
    function getEucledianDistance(x1, y1, x2, y2) {
      return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1))
    }

    return (
      (getEucledianDistance(
        upper[5][0],
        upper[5][1],
        lower[4][0],
        lower[4][1]
      ) +
        getEucledianDistance(
          upper[3][0],
          upper[3][1],
          lower[2][0],
          lower[2][1]
        )) /
      (2 *
        getEucledianDistance(
          upper[0][0],
          upper[0][1],
          upper[8][0],
          upper[8][1]
        ))
    )
  }

  async hadBlinked(video) {
    const predictions = await this.#estimateFaces(video)

    if (!predictions.length) return false
    for (const prediction of predictions) {

      const lowerRight = prediction.annotations.rightEyeUpper0
      const upperRight = prediction.annotations.rightEyeLower0
      const rightEAR = this.#getEAR(upperRight, lowerRight)

      const lowerLeft = prediction.annotations.leftEyeUpper0
      const upperLeft = prediction.annotations.leftEyeLower0
      const leftEAR = this.#getEAR(upperLeft, lowerLeft)

      const leftEyeClosed = leftEAR <= EAR_THRESHOLD
      const rightEyeClosed = rightEAR <= EAR_THRESHOLD

      const blinked = leftEyeClosed || rightEyeClosed
      if (!blinked) continue
      if (!shouldRun()) continue

      const leftBlinked = leftEyeClosed && !rightEyeClosed
      if (leftBlinked) return 'left'

      const rightBlinked = !leftEyeClosed && rightEyeClosed
      if (rightBlinked) return 'right'

      const bothBlinked = leftEyeClosed && rightEyeClosed
      if (bothBlinked) return 'both'
    }
    return false
  }

  #estimateFaces(video) {
    return this.#model.estimateFaces({
      input: video,
      returnTensors: false,
      flipHorizontal: true,
      predictIrises: true,
    })
  }
}
