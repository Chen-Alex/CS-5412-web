var cnts = Array(20);
for (var i = 0; i < 20; i++) {
  cnts[i] = Array(20);
}

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

window.onload = function() {
  var map = document.getElementById("map");
  ctx.drawImage(map, 0, 0);
}

function process() {
  let datetime = new Date(document.getElementById("datetime").value);
  let month = datetime.getMonth() + 1;
  let weekofmonth = Math.floor((datetime.getDate() - 1) / 7) + 1;
  let dayofweek = datetime.getDay() + 1;
  let hourofday = datetime.getHours();
  let type = document.getElementById("type").value;
  
  console.log(month);
  if (isNaN(month) || isNaN(weekofmonth) || isNaN(dayofweek) || isNaN(hourofday)) {
    alert("Please input a valid date and time!")
    return;
  }
  
  if (datetime.getYear() != 114) {
    alert("Warning: data only contains information from 2014.")
  }
  
  let req = {month: month, week: weekofmonth, day: dayofweek, hour: hourofday, type: type};
  
  
  fetch("/post", 
    {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: "POST",
      body: JSON.stringify(req)
    }
  )
  .then(res => res.json())
  .then(jsn => {
    var maxcnt = 0;
    for (var i = 0; i < 20; i++) {
      for (var j = 0; j < 20; j++) {
        if (!([i, j] in jsn)) {
          cnts[i][j] = 0;
        } else {
          cnts[i][j] = Math.max(jsn[[i, j]] + 1, 1);
          cnts[i][j] = Math.log(cnts[i][j]);
          maxcnt = Math.max(cnts[i][j], maxcnt);
        }
      }
    }
    console.log(cnts);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var map = document.getElementById("map");
    ctx.drawImage(map, 0, 0);
    for (var i = 0; i < 20; i++) {
      for (var j = 0; j < 20; j++) {
        let red = cnts[i][j] / maxcnt * 255;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + red + ',0,' + (255 - red) + ',0.5)';
        ctx.fillRect(760 - 40 * i, 40 * j, 40, 40);
        ctx.closePath();
        ctx.stroke();
      }
    }
  });
}