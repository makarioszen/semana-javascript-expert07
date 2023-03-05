export default class Controller {
    #view
    #worker
    #blinkCounter = {
        left: 0,
        right: 0,
        both: 0
    }
    #camera


    constructor({ view, worker, camera }) {
        this.#view = view
        this.#camera = camera
        this.#worker = this.#configureWorker(worker)
    }

    static async initialize(deps) {
        const controller = new Controller(deps)
        controller.log('not yet detecting eye blink! click in the button to start')
        return controller.init()
    }

    #configureWorker(worker) {
        let ready = false
        worker.onmessage = ({ data }) => {
            if ('READY' === data) {
                this.#view.enableButton()
                ready = true
                console.log('Camera worker is ready');
                return;
            }

            const { blinked } = data
            if (!blinked) return;

            this.#blinkCounter[blinked]++
            this.log(`you blinked eye ${blinked}`)
            if (blinked === 'both') {
                this.#view.togglePlayVideo();
            }
        }
        return {
            send(msg) {
                if (!ready) return;
                worker.postMessage(msg)
            }
        }
    }

    async init() {
        console.log('Run Video Player');
        this.#view.configureOnBtnClick(this.onBtnStart.bind(this))
    }

    log(text) {
        const times = `      - blinked times: ${this.#blinkCounter}`
        this.#view.log(`logger: ${text}`.concat(this.#blinkCounter ? times : ''))
    }

    onBtnStart() {
        this.log('initializing detection ...')
        this.#blinkCounter = {
            left: 0,
            right: 0,
            both: 0
        }
        this.loop()
    }

    loop() {
        const video = this.#camera.video
        const img = this.#view.getVideoFrame(video)
        this.#worker.send(img)
        setTimeout(() => this.loop(), 100);
    }


}