/*
Outer Orbit = Hours
Middle Orbit = Minutes
Inner Orbit = Seconds
*/


let dt = new Date();
let hours = 0;
let mintues = 0;
let seconds = 0;
let maxHours = 12;
let maxSeconds = 60;
let maxMinutes = 60;
let deg = 360;

setTime();

function setTime(){
  let calcDeg = 0;
  dt = new Date();
  hours = dt.getHours();
  minutes = dt.getMinutes();
  seconds = dt.getSeconds();
  
  // Work out initial position of Hours Hand
  let hoursPerc = (hours / maxHours) * 100;
  calcDeg = Math.round((((hoursPerc * deg) / 100)));
  $('.hours.arm').css({transform:'rotate('+calcDeg+'deg)'});
  
  // Work out initial position of Minutes Hand
  let minutesPerc = (minutes / maxMinutes) * 100;
  calcDeg = Math.round((((minutesPerc * deg) / 100)));
  $('.minutes.arm').css({transform:'rotate('+calcDeg+'deg)'});
  
  // Work out initial position of Seconds Hand
  let secondsPerc = (seconds / maxSeconds) * 100;
  calcDeg = Math.round((((secondsPerc * deg) / 100)));
  $('.seconds.arm').css({transform:'rotate('+calcDeg+'deg)'});
  
  animateArms();
}

function animateArms() {
  // Animate Seconds Arm
  TweenMax.to( 
    $('.seconds.arm'), 
    60,
    {ease: Power0.easeNone, rotation:'+=360', repeat: -1},
  );
  
  // Animate Minutes Arm
  TweenMax.to( 
    $('.minutes.arm'), 
    3600,
    {ease: Power0.easeNone, rotation:'+=360', repeat: -1},
  );
  
  // Animate Hours Arm
  TweenMax.to( 
    $('.hours.arm'), 
    43200,
    {ease: Power0.easeNone, rotation:'+=360', repeat: -1},
  );
}