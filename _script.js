let dt = new Date();
let hours = 0;
let minutes = 0;
let seconds = 0;
const maxHours = 12;
const maxSeconds = 60;
const maxMinutes = 60;
const deg = 360;

setTime();

function setTime(){
  let calcDeg = 0;
  dt = new Date();
  hours = dt.getHours();
  minutes = dt.getMinutes();
  seconds = dt.getSeconds();
  
  // Initial position of Hours Hand
  let hoursPerc = (hours / maxHours) * 100;
  calcDeg = Math.round((((hoursPerc * deg) / 100)));
  document.querySelector('.hours.arm').style.transform = `rotate(${calcDeg}deg)`;
  
  // Initial position of Minutes Hand
  let minutesPerc = (minutes / maxMinutes) * 100;
  calcDeg = Math.round((((minutesPerc * deg) / 100)));
  document.querySelector('.minutes.arm').style.transform = `rotate(${calcDeg}deg)`;
  
  // Initial position of Seconds Hand
  let secondsPerc = (seconds / maxSeconds) * 100;
  calcDeg = Math.round((((secondsPerc * deg) / 100)));
  document.querySelector('.seconds.arm').style.transform = `rotate(${calcDeg}deg)`;
  
  animateArms();
}

function animateArms() {
  // Animate Seconds Arm
  gsap.to(
    document.querySelector('.seconds.arm'), 
    {duration: 60, ease: "none", rotation: '+=360', repeat: -1}
  );
  
  // Animate Minutes Arm
  gsap.to(
    document.querySelector('.minutes.arm'), 
    {duration: 3600, ease: "none", rotation: '+=360', repeat: -1}
  );
  
  // Animate Hours Arm
  gsap.to(
    document.querySelector('.hours.arm'), 
    {duration: 43200, ease: "none", rotation: '+=360', repeat: -1}
  );
}
