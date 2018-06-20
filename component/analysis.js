var Sentiment     = require('sentiment')
var TwitterStream = require('twitter-stream-api')


// TL;DR: Tokens are scored between -5 (highly negative) and 5
// (highly positive) with 0 being "neutral". Comparative scores are
// simply SUM(tokens) / number of tokens.
// Details can be found in the AFINN whitepaper:
// http://www2.imm.dtu.dk/pubdb/views/publication_details.php?id=6010

// https://github.com/thisandagain/sentiment/issues/107

const COLLATION = 10
let data = []
let sentiment = null

let init = () => {
  sentiment = new Sentiment()
  twitterListen()
}


let twitterListen = function() {
  let resetRoutine = () => {
    if (Twitter) {
      Twitter.close()
      Twitter = null
    }
    init()
  }

  let Twitter = new TwitterStream(cfg.sentiment.twitter, true)

  // this causes a sentinel loop
  // Twitter.on('connection aborted', function () {
  //   console.log('sentiment: connection aborted')
  //   setTimeout(() => { resetRoutine() }, 2000)
  // })

  Twitter.on('connection error network', function (error) {
    console.log('sentiment: connection error network', error)
    setTimeout(() => { resetRoutine() }, 2000)
  })

  Twitter.on('connection error http', function (httpStatusCode) {
    console.log('connection error http', httpStatusCode)
    setTimeout(() => { resetRoutine() }, 2000)
  })

  Twitter.on('connection rate limit', function (httpStatusCode) {
    console.log('connection rate limit', httpStatusCode)
    setTimeout(() => { resetRoutine() }, 10000)
  })

  Twitter.on('connection error unknown', function (error) {
    console.log('connection error unknown', error)
    setTimeout(() => { resetRoutine() }, 4000)
  })

  Twitter.on('data error', function (error) {
    console.log('data error', error)
    setTimeout(() => { resetRoutine() }, 2000)
  })


  Twitter.stream('statuses/filter', { // statuses/firehose
    track: cfg.sentiment.keywords // check github docs, twitter docco is shite
  })

  Twitter.on('data', function (obj) {
    let tweet = obj.text;
    if (obj.extended_tweet && obj.extended_tweet.full_text) {
      tweet = obj.extended_tweet.full_text
    }

    analyze(tweet)
  })

  console.log('sentiment: listening')
}


let analyze = function(text) {
  let result = {
    score: 0,
    comparative: 0
  }

  let scoreObj = sentiment.analyze(text)

  result.score = scoreObj.score
  result.comparative = scoreObj.comparative

  // console.log('\ntext:', text)
  // console.log(result)

  if (result.comparative == 0) return

  data.push(result)
}


// average out what we have so far and send it, then
// clear the existing data for another round

let get = () => {
  let tmp = data

  if (tmp.length >= COLLATION) {
    let res = {
      score: 0,
      comparative: 0,
      count: COLLATION
    }

    for (let i = 0, iLen = tmp.length; i < iLen; i++) {
      res.score += tmp[i].score
      res.comparative += tmp[i].comparative
    }

    res.score = res.score / tmp.length
    res.comparative = res.comparative / tmp.length

    data = []
    return res
  } else {
    return null
  }
}


module.exports = {
  init: init,
  get: get
}
