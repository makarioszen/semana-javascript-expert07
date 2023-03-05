export default class Controller {
    #view
    #camera
    #worker
    #blinks = { right: 0, left: 0, both: 0 }
    constructor({ view, worker, camera, videoUrl }) {
        this.#view = view
        this.#view.configureOnBtnClick(this.onBtnStart.bind(this))
        this.#camera = camera
        this.#worker = this.#configureWorker(worker)
        this.#view.setVideoSrc(videoUrl)
    }

    static async initialize(deps) {
        const controller = new Controller(deps)
        controller.log('not yet detecting eye blink! click in the button to start')
        return controller.init()
    }

    #configureWorker(worker) {
        let ready = false
        worker.onmessage = ({ data }) => {
            if (data === 'READY') {
                console.log('worker is ready!')
                this.#view.enableBtn()
                ready = true
                return
            }
            const blinked = data.blinked
            this.#blinks[blinked] += 1
            if (blinked === 'both') {
                this.#view.togglePlayVideo()
            }
        }

        return {
            send(msg) {
                if (!ready) return
                worker.postMessage(msg)
            },
        }
    }

    loop() {
        const video = this.#camera.video
        const img = this.#view.getVideoFrame(video)
        this.#worker.send(img)
        this.log('detecting eye blink ...')
        setTimeout(() => this.loop(), 100)
    }

    async init() {
        console.log('init!!')
    }

    log(text) {
        const times = `    - blinked times - both: ${this.#blinks['both']}, left: ${this.#blinks['left']
            }, right: ${this.#blinks['right']}`
        this.#view.log(
            `status: ${text}`.concat(
                this.#blinks['both'] || this.#blinks['left'] || this.#blinks['right']
                    ? times
                    : ''
            )
        )
    }

    onBtnStart() {
        this.log('initializing detection ...')
        this.#blinks = { right: 0, left: 0, both: 0 }
        this.loop()
    }
}
