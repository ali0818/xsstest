


document.getElementById('btn').addEventListener('click', ()=>{
  document.getElementById('load').style.display='block'
  let url2 = document.getElementById('scanner-input').value 
  axios({
      method:'get',
      url:'http://localhost:3030/scanner',
      params: {
        url: url2
      }
  }) .then(res => {

    console.log(res.data)
    divRes = document.getElementById('result')
    if (res.data === true){
     document.getElementById('load').style.display='none'
      divRes.innerHTML  = '<span class="red">The Website have XSS Vulnerability</span>'
    }
    else if(res.data === false){
      document.getElementById('load').style.display='none'
      divRes.innerHTML  = '<span class="green">The website is safe</span>'
    }
    else{
      document.getElementById('load').style.display='none'
      divRes.innerHTML  = '<p class="error"> Sorry for the inconvenience the scanner cant complete the scaning due to <b>Error</b></p>'+
      `<p class="error">Error: ${res.data}</p>`
    }
  })
})







