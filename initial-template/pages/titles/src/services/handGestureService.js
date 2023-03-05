

export default class HandGestureService {
    #gestureEstimator
    #handPoseDetection
    #handsVersion
    #detector = null

    constructor({ fingerpose, handPoseDetection, handsVersion }) {
        this.#handPoseDetection = handPoseDetection
        this.#handsVersion = handsVersion
        this.#gestureEstimator = new fingerpose.GestureEstimator(knowGestures)
    }

    async estimate(keypoints3D) {
        const predictions = this.#gestureEstimator.estimate(
            this.getLandMarksFromKeyPoints(keypoints3D),
            9 //porcentagem de confiança do gesto 90%
        )

        return predictions.gestures

    }

    async *detectGestures(predections) {
        for (const hand of predections) {
            if (!hand.keypoints3D) continue

            const gesture = await this.estimate(hand.keypoints3D)
            if (!gesture.length) continue

            const result = gesture.reduce(
                (previous, current) => (previous.score > current.score) ? previous : current
            )

            const { x, y } = hand.keypoints.find(
                keypoint => keypoint.name == 'index_finger_tip'
            )

            console.log('detected', this.#gestureStrings[result.name]);
            yield { event: result.name, x, y }
        }
    }

    getLandMarksFromKeyPoints(keypoints3D) {
        return keypoints3D.map(
            kp => [kp.x, kp.y, kp.z]
        )

    }

    async estimateHands(video) {
        return this.#detector.estimateHands(video, {
            flipHorizontal: true
        })
    }

    async initilizeDetector() {
        if (this.#detector) return this.#detector

        const detectorConfig = {
            runtime: 'mediapipe',
            solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${this.#handsVersion}`,
            modelType: 'lite',
            maxHands: 2
        }

        this.#detector = await this.#handPoseDetection.createDetector(
            this.#handPoseDetection.SupportedModels.MediaPipeHands,
            detectorConfig
        )

        return this.#detector
    }

}