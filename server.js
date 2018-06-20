global.cfg    = require('./config')
let analysis  = require('./component/analysis')

let loopInterval = null
const LOOP_MS    = 2500 // ms


let loop = () => {
  if (loopInterval) clearInterval(loopInterval)

  loopInterval = setInterval(() => {
    let data = analysis.get()
    console.info('\n===\ncumulative score', data, '\n===\n')
  }, LOOP_MS)
}


let main = () => {
  analysis.init()

  loop()
}


main()
